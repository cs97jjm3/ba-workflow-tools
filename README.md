# BA Workflow Tools MCP Server

Complete toolkit for Business Analysts - everything you need to plan sprints, manage backlogs, and format requirements properly.

## What's In Here

### Working Days & Sprint Planning
- **calculate_working_days** - Working days between two dates
- **add_working_days** - Add X working days to a date
- **subtract_working_days** - Subtract X working days from a date
- **calculate_sprint_dates** - Generate multiple sprint dates at once
- Automatically excludes UK weekends and bank holidays (2024-2026)

### Release Planning & Velocity
- **calculate_release_date** - "I've got 85 points left, velocity is 25, when do we finish?"
- **calculate_velocity** - Calculate average velocity with capacity adjustments for holidays
- Accounts for team days off, sprint length, team size changes

### Fiscal Planning
- **calculate_fiscal_quarter** - UK fiscal quarters (or configure your own)
- Returns fiscal year, quarter, quarter start/end dates
- Default: UK fiscal year starts April 1

### User Story Formatting
- **format_user_story** - Formats into proper structure:
  - Requirement (As a...I want...So that...)
  - Placement on Page
  - Expected Behavior
  - Extra Information
  - Acceptance Criteria (Given/When/Then)

### MoSCoW Prioritization
- **calculate_moscow_priority** - Breakdown by Must/Should/Could/Won't with points and percentages
- **plan_moscow_capacity** - "I've got 50 points capacity - what fits based on MoSCoW?"
- **validate_moscow_dependencies** - Finds problems like Must-haves depending on Won't items

### Estimation Tools
- **generate_requirement_ids** - Generate sequences: REQ-001, REQ-002, etc.
- **convert_points_to_hours** - Story points to hours with configurable overhead
- **convert_estimation** - Convert between T-shirt sizes, story points, and hours

### Timezone Tools
- **convert_timezone** - Convert times between GMT, EST, AEST, CET, MYT, etc.
- **find_meeting_time** - Find times that work across multiple timezones

### Text Utilities
- **text_utilities** - 11 operations:
  - Word count, character count
  - Remove duplicate lines, sort lines
  - Extract emails or URLs from text
  - Convert case (upper, lower, title)
  - Trim whitespace, add line numbers

## Installation

### Recommended: One-Click Bundle Install

1. Build the bundle:
```bash
npm install
mcpd build
```

2. In Claude Desktop:
   - Settings → Developer → Extensions → Add Extension
   - Select `ba-workflow-tools.mcpb`
   - Click Install

### Alternative: Manual Config

Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "ba-workflow-tools": {
      "command": "node",
      "args": ["C:\\Users\\james\\Documents\\BA Tools\\src\\index.js"]
    }
  }
}
```

Then restart Claude Desktop.

## Usage Examples

**Release planning:**
"I've got 85 story points left in my backlog, team velocity is 25 points per sprint, sprints are 2 weeks. When will we finish?"

**Velocity calculation:**
"Team completed [28, 32, 25, 30] points in the last 4 sprints. We have 3 people taking 2 days off next sprint. What's our adjusted velocity?"

**Fiscal quarters:**
"What fiscal quarter is March 15th 2025 in?"

**Sprint dates:**
"Calculate 6 two-week sprints starting 2025-01-06"

**MoSCoW capacity planning:**
"I have these requirements with MoSCoW priorities and 50 points capacity - what can I commit to?"

**MoSCoW dependency validation:**
"Check if any of my Must-haves depend on Could-haves or Won't items"

**Working days:**
"How many working days between today and Christmas?"

**User story formatting:**
"Format this: As a care home manager, I want to see resident medication history, so that I can review changes over time"

**Timezone conversion:**
"What's 14:00 GMT in AEST?"

**Meeting times:**
"Find meeting times for UK (GMT 9-17), Romania (CET 9-17), and Malaysia (MYT 9-17)"

**Estimation conversion:**
"Convert L (T-shirt size) to story points"

**Points to hours:**
"Convert 30 story points to hours with 20% overhead"

**Requirement IDs:**
"Generate 20 requirement IDs starting at REQ-045"

**Fiscal quarter:**
"What quarter is 2025-06-15 in?"

**Text utilities:**
"Extract all email addresses from this text"

## All 15 Tools

1. **calculate_working_days** - Working days between dates
2. **add_working_days** - Add working days to a date
3. **subtract_working_days** - Subtract working days from a date
4. **calculate_sprint_dates** - Calculate multiple sprint dates
5. **format_user_story** - Format requirements properly
6. **convert_timezone** - Convert time between zones
7. **find_meeting_time** - Find suitable meeting times across timezones
8. **text_utilities** - Various text operations
9. **calculate_release_date** - Estimate release date from velocity
10. **calculate_velocity** - Team velocity with capacity adjustments
11. **calculate_fiscal_quarter** - Fiscal quarter and year info
12. **generate_requirement_ids** - Generate requirement ID sequences
13. **convert_points_to_hours** - Story points to hours conversion
14. **convert_estimation** - Convert between estimation systems
15. **calculate_moscow_priority** - MoSCoW priority breakdown
16. **plan_moscow_capacity** - MoSCoW capacity planning
17. **validate_moscow_dependencies** - MoSCoW dependency validation

## Bank Holidays

Currently includes UK bank holidays for 2024-2026. Extend the array in `src/index.js` as needed.

---

## 📚 Want to Build Tools Like This?

This tool was built using the process documented in **["The Business Analyst's Guide to AI-Assisted Tool Development"](https://gumroad.com/l/ba-ai-tools)**.

Learn how to:
- Identify workflows worth automating
- Work effectively with AI as a collaborator
- Build production-ready tools without being a developer
- Avoid common pitfalls and mistakes

**£5 • Real code • Real examples • Real process**

Available February 4th, 2025

---

## License

MIT
