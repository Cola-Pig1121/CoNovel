#!/bin/bash
# CoNovel Setup Script - 安装Python依赖

echo "=== CoNovel Setup ==="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 not found. Please install Python 3.8+"
    exit 1
fi

echo "Python version:"
python3 --version

# Install litellm
echo ""
echo "Installing litellm..."
pip3 install litellm

# Verify installation
echo ""
echo "Verifying litellm installation..."
python3 -c "import litellm; print(f'litellm version: {litellm.__version__}')"

# Test the bridge script
echo ""
echo "Testing LLM bridge..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$SCRIPT_DIR/llm_bridge.py" --action check_reasoning --input '{"model":"openai/o3-mini"}'

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Start your LLM provider (e.g., LiteLLM proxy or direct API)"
echo "2. Open CoNovel Studio: cd packages/studio && pnpm dev"
echo "3. Configure provider in Settings -> Model Providers"
echo "4. Configure agent models in Settings -> Agent Model Config"
echo "5. Create a book and start writing!"
