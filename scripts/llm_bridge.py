#!/usr/bin/env python3
"""
CoNovel LLM Bridge - Python桥接脚本

通过litellm SDK调用AI模型，支持：
- 自动扫描服务商模型（Model Discovery）
- 检测思考强度（Reasoning Effort）
- 统一参数归一化（Parameter Mapping）
- 多供应商支持

用法:
  # 同步调用
  python llm_bridge.py --action completion --input '{"model":"openai/gpt-4o","system":"...","user":"...","temperature":0.7}'

  # 扫描模型
  python llm_bridge.py --action scan_models --input '{"provider":"openai","api_key":"sk-..."}'

  # 检测思考强度
  python llm_bridge.py --action check_reasoning --input '{"model":"openai/o3-mini"}'
"""

import sys
import json
import os
import argparse

try:
    import litellm
    from litellm import completion, supports_reasoning, model_prices_and_context_window
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "litellm not installed. Run: pip install litellm",
        "install_command": "pip install litellm"
    }))
    sys.exit(1)


def handle_completion(input_data: dict) -> dict:
    """调用LLM进行文本生成"""
    model = input_data.get("model", "")
    system_prompt = input_data.get("system", "")
    user_message = input_data.get("user", "")
    temperature = input_data.get("temperature", 0.7)
    max_tokens = input_data.get("max_tokens", 4096)
    reasoning_effort = input_data.get("reasoning_effort")

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_message})

    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    # Add reasoning effort if the model supports it
    if reasoning_effort and supports_reasoning(model=model):
        kwargs["reasoning_effort"] = reasoning_effort

    try:
        response = completion(**kwargs)
        content = response.choices[0].message.content or ""

        # Extract usage
        usage = {}
        if hasattr(response, 'usage') and response.usage:
            usage = {
                "promptTokens": getattr(response.usage, 'prompt_tokens', 0),
                "completionTokens": getattr(response.usage, 'completion_tokens', 0),
                "totalTokens": getattr(response.usage, 'total_tokens', 0),
            }

        return {
            "success": True,
            "content": content,
            "usage": usage,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "content": "",
        }


def handle_scan_models(input_data: dict) -> dict:
    """扫描服务商可用模型"""
    provider = input_data.get("provider", "")
    api_key = input_data.get("api_key", "")
    base_url = input_data.get("base_url", "")

    # Build model prefix for litellm
    model_prefix = f"{provider}/" if provider else ""

    try:
        # Get model database
        model_db = litellm.model_prices_and_context_window

        # Filter models by provider
        models = []
        for model_id, meta in model_db.items():
            if provider and not model_id.startswith(provider):
                # Also check if provider is in the model metadata
                if provider.lower() not in model_id.lower():
                    continue

            supports = supports_reasoning(model=model_id) if model_id else False

            # Determine reasoning levels
            reasoning_levels = []
            if supports:
                if "gpt-5" in model_id or "opus" in model_id:
                    reasoning_levels = ["low", "medium", "high", "max"]
                else:
                    reasoning_levels = ["low", "medium", "high"]

            models.append({
                "id": model_id,
                "supportsReasoning": supports,
                "reasoningLevels": reasoning_levels,
                "contextWindow": meta.get("max_input_tokens", meta.get("max_tokens", 0)),
                "costPerToken": meta.get("input_cost_per_token", 0),
            })

        return {
            "success": True,
            "models": models,
            "count": len(models),
            "reasoningCount": sum(1 for m in models if m["supportsReasoning"]),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "models": [],
        }


def handle_check_reasoning(input_data: dict) -> dict:
    """检测模型是否支持思考强度"""
    model = input_data.get("model", "")

    try:
        supported = supports_reasoning(model=model)

        reasoning_levels = []
        if supported:
            model_db = litellm.model_prices_and_context_window
            meta = model_db.get(model, {})
            if "gpt-5" in model or "opus" in model:
                reasoning_levels = ["low", "medium", "high", "max"]
            else:
                reasoning_levels = ["low", "medium", "high"]

        return {
            "success": True,
            "model": model,
            "supportsReasoning": supported,
            "reasoningLevels": reasoning_levels,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "supportsReasoning": False,
            "reasoningLevels": [],
        }


def main():
    parser = argparse.ArgumentParser(description="CoNovel LLM Bridge")
    parser.add_argument("--action", required=True, choices=["completion", "scan_models", "check_reasoning"])
    parser.add_argument("--input", required=True, help="JSON input data")

    args = parser.parse_args()

    try:
        input_data = json.loads(args.input)
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    if args.action == "completion":
        result = handle_completion(input_data)
    elif args.action == "scan_models":
        result = handle_scan_models(input_data)
    elif args.action == "check_reasoning":
        result = handle_check_reasoning(input_data)
    else:
        result = {"success": False, "error": f"Unknown action: {args.action}"}

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
