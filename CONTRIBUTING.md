# Contributing to BA Workflow Tools

Thanks for your interest in contributing! This MCP server is built to solve real BA workflow problems, and community contributions help make it better for everyone.

## Ways to Contribute

### Report Issues
Found a bug? Have a feature request?
- Check [existing issues](https://github.com/cs97jjm3/ba-workflow-tools/issues) first
- Open a new issue with clear description and examples
- Use labels: `bug`, `enhancement`, `documentation`, `question`

### Suggest Features
See something missing? Check the [ROADMAP.md](ROADMAP.md) first, then:
- Open an issue with the `enhancement` label
- Describe the use case and why it's valuable
- Provide examples of how it would work

### Submit Code
Want to build a feature?

1. **Fork the repo** and create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow the code structure:**
   - Add function definitions after existing functions
   - Add tool schema in `ListToolsRequestSchema` handler
   - Add tool execution case in `CallToolRequestSchema` handler
   - Keep it simple - no external dependencies if possible

3. **Test thoroughly:**
   - Build the bundle: `mcpb pack`
   - Install in Claude Desktop
   - Test all parameters and edge cases
   - Test with user config settings

4. **Document your changes:**
   - Update README.md if user-facing
   - Add examples to documentation
   - Comment complex logic

5. **Submit a Pull Request:**
   - Clear description of what and why
   - Reference any related issues
   - Include example usage

## Development Setup

```bash
# Clone the repo
git clone https://github.com/cs97jjm3/ba-workflow-tools.git
cd ba-workflow-tools

# Install dependencies
npm install

# Build the bundle
mcpb pack

# Install in Claude Desktop
# Settings → Developer → Extensions → Add Extension → select .mcpb file
```

## Code Style

- Use clear, descriptive function and variable names
- Keep functions focused and single-purpose
- Return JSON objects from tools for consistency
- Handle errors gracefully with try/catch
- Comment non-obvious logic

## Adding New Tools

Example structure:

```javascript
// 1. Add the function
function yourNewTool(param1, param2) {
  // Implementation
  return {
    result: "value"
  };
}

// 2. Add to tool list
{
  name: 'your_new_tool',
  description: 'Clear description of what it does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'What this parameter is for'
      }
    },
    required: ['param1']
  }
}

// 3. Add execution handler
case 'your_new_tool': {
  const result = yourNewTool(args.param1, args.param2);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2)
    }]
  };
}
```

## Adding User Configuration

To add a new user config option:

1. Add to `manifest.json` under `user_config`
2. Add to `mcp_config.env` mapping
3. Read in `src/index.js` with `process.env.YOUR_VAR`
4. Use as default in relevant functions

## Country/Region Support

Adding support for a new country's working days:

1. Add holiday array like `US_BANK_HOLIDAYS`
2. Make holiday selection based on user config
3. Test thoroughly with that country's calendar
4. Document in README

## Questions?

Open an issue with the `question` label or reach out:
- GitHub: [@cs97jjm3](https://github.com/cs97jjm3)
- Email: murrell.james@gmail.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
