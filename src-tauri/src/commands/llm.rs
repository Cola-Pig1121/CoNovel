use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct LLMCompletionInput {
    pub model_id: String,
    pub system: Option<String>,
    pub user: String,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub provider_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LLMUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
}

#[derive(Debug, Serialize)]
pub struct LLMCompletionResult {
    pub success: bool,
    pub content: String,
    pub usage: LLMUsage,
    pub finish_reason: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIResponseMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponseMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: Option<u32>,
    completion_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    usage: Option<OpenAIUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAIModel {
    id: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIModelsResponse {
    data: Vec<OpenAIModel>,
}

/// Call an LLM via HTTP — supports OpenAI-compatible and Anthropic APIs directly.
/// No Python/litellm dependency.
#[tauri::command]
pub fn call_llm(
    base_url: String,
    api_key: String,
    api_format: String,
    input: String,
) -> Result<serde_json::Value, String> {
    let params: LLMCompletionInput =
        serde_json::from_str(&input).map_err(|e| format!("Invalid input JSON: {}", e))?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let temperature = params.temperature.unwrap_or(0.7);
    let max_tokens = params.max_tokens.unwrap_or(4096);

    match api_format.as_str() {
        "anthropic" => call_anthropic(&client, &base_url, &api_key, &params, temperature, max_tokens),
        _ => call_openai_compatible(&client, &base_url, &api_key, &params, temperature, max_tokens),
    }
}

/// Call OpenAI-compatible API (/v1/chat/completions)
fn call_openai_compatible(
    client: &Client,
    base_url: &str,
    api_key: &str,
    params: &LLMCompletionInput,
    temperature: f64,
    max_tokens: u32,
) -> Result<serde_json::Value, String> {
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let mut messages = Vec::new();
    if let Some(ref sys) = params.system {
        if !sys.is_empty() {
            messages.push(serde_json::json!({
                "role": "system",
                "content": sys
            }));
        }
    }
    messages.push(serde_json::json!({
        "role": "user",
        "content": params.user
    }));

    let body = serde_json::json!({
        "model": params.model_id,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    });

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = resp.status();
    let text = resp
        .text()
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, text));
    }

    let parsed: OpenAIResponse =
        serde_json::from_str(&text).map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = parsed
        .choices
        .first()
        .and_then(|c| c.message.content.clone())
        .unwrap_or_default();
    let finish_reason = parsed
        .choices
        .first()
        .and_then(|c| c.finish_reason.clone())
        .unwrap_or_else(|| "stop".to_string());
    let usage = parsed.usage.as_ref().map(|u| LLMUsage {
        prompt_tokens: u.prompt_tokens.unwrap_or(0),
        completion_tokens: u.completion_tokens.unwrap_or(0),
    }).unwrap_or(LLMUsage {
        prompt_tokens: 0,
        completion_tokens: 0,
    });

    Ok(serde_json::json!({
        "success": true,
        "content": content,
        "usage": usage,
        "finish_reason": finish_reason,
    }))
}

/// Call Anthropic API (/v1/messages)
fn call_anthropic(
    client: &Client,
    base_url: &str,
    api_key: &str,
    params: &LLMCompletionInput,
    temperature: f64,
    max_tokens: u32,
) -> Result<serde_json::Value, String> {
    let url = format!("{}/messages", base_url.trim_end_matches('/'));

    let mut body = serde_json::json!({
        "model": params.model_id,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{
            "role": "user",
            "content": params.user
        }],
    });

    if let Some(ref sys) = params.system {
        if !sys.is_empty() {
            body["system"] = serde_json::json!(sys);
        }
    }

    let resp = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = resp.status();
    let text = resp
        .text()
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, text));
    }

    // Parse Anthropic response
    let parsed: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = parsed["content"]
        .as_array()
        .and_then(|arr| {
            arr.first()
                .and_then(|block| block["text"].as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_default();

    let finish_reason = parsed["stop_reason"]
        .as_str()
        .unwrap_or("end_turn")
        .to_string();

    let usage = LLMUsage {
        prompt_tokens: parsed["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32,
        completion_tokens: parsed["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32,
    };

    Ok(serde_json::json!({
        "success": true,
        "content": content,
        "usage": usage,
        "finish_reason": finish_reason,
    }))
}

/// Scan models from an OpenAI-compatible endpoint (/v1/models)
#[tauri::command]
pub fn scan_models(
    base_url: String,
    api_key: String,
) -> Result<serde_json::Value, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!("{}/models", base_url.trim_end_matches('/'));

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = resp.status();
    let text = resp
        .text()
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, text));
    }

    let parsed: OpenAIModelsResponse =
        serde_json::from_str(&text).map_err(|e| format!("Failed to parse response: {}", e))?;

    let models: Vec<serde_json::Value> = parsed
        .data
        .iter()
        .map(|m| {
            serde_json::json!({
                "id": m.id,
                "contextWindow": 0,
                "supportsReasoning": false,
                "reasoningLevels": [],
            })
        })
        .collect();

    Ok(serde_json::json!({
        "success": true,
        "models": models,
        "count": models.len(),
    }))
}
