# Quick Start - One-Click Install

## Step 1: Build the Bundle

Open PowerShell or Command Prompt in this folder and run:

```bash
npm install
mcpd build
```

This creates `ba-workflow-tools.mcpb` - a single file you can install with one click in Claude Desktop.

## Step 2: Install in Claude Desktop

1. Open Claude Desktop
2. Go to Settings → Developer → Extensions
3. Click "Add Extension"
4. Select the `ba-workflow-tools.mcpb` file
5. Click Install

Done. The tools are now available.

## Test It

Open Claude Desktop and try:
- "How many working days between today and Christmas?"
- "Calculate 4 two-week sprints starting next Monday"
- "Convert 14:00 GMT to Romanian time"

## Tools You've Got

- Working days calculator (between dates, add, subtract)
- Sprint date calculator
- User story formatter
- Timezone converter
- Meeting time finder
- Text utilities (word count, sort, dedupe, extract emails/URLs, etc.)

## Alternative: Manual Install

If you want to install manually (not recommended):

1. Open: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add:
```json
{
  "mcpServers": {
    "ba-workflow-tools": {
      "command": "node",
      "args": [
        "C:\\Users\\james\\Documents\\BA Tools\\src\\index.js"
      ]
    }
  }
}
```
3. Restart Claude Desktop

But using the `.mcpb` bundle is easier.
