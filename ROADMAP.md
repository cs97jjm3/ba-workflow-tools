# BA Workflow Tools - Roadmap

## Current Status (v1.0.0)
- 17 working tools for BA workflows
- UK-specific working days and bank holidays
- User-configurable fiscal year, sprint length, point ratios, overhead
- One-click installation via .mcpb bundle

## Planned Features

### v1.1.0 - Multi-Country Support
**Priority: High**
- [ ] Country/region configuration in user settings
- [ ] Bank holiday calendars for multiple countries:
  - UK (current)
  - US
  - Canada
  - Australia
  - EU countries
  - India
  - Malaysia
- [ ] Timezone improvements:
  - Auto-detect user's timezone
  - More comprehensive timezone database
  - Daylight saving time handling

### v1.2.0 - Enhanced Planning Tools
**Priority: Medium**
- [ ] Burndown/burnup chart data generation
- [ ] Capacity planning with multiple teams
- [ ] Risk-adjusted release date calculations (best case/worst case/most likely)
- [ ] Sprint retrospective data tracking
- [ ] Dependency mapping and critical path analysis

### v1.3.0 - Integration & Export
**Priority: Medium**
- [ ] Export sprint plans to CSV/Excel
- [ ] Jira integration (import story points, velocity)
- [ ] Azure DevOps integration
- [ ] Google Calendar integration for sprint dates
- [ ] Slack notifications for sprint milestones

### v1.4.0 - Advanced Analytics
**Priority: Low**
- [ ] Velocity trend analysis and forecasting
- [ ] Team performance metrics over time
- [ ] Cycle time and lead time calculations
- [ ] Throughput analysis
- [ ] Predictive release date modeling

### v2.0.0 - Enterprise Features
**Priority: Future**
- [ ] Multi-project portfolio planning
- [ ] Resource allocation across projects
- [ ] Budget tracking vs story points
- [ ] Stakeholder reporting templates
- [ ] Custom workflow definitions

## Community Requests
Have a feature request? [Open an issue](https://github.com/cs97jjm3/ba-workflow-tools/issues) with the label `enhancement`.

## Contributing
Want to help build these features? See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Decisions & Trade-offs

### Why UK-first?
- Developer is UK-based BA
- Serves immediate need
- Foundation for multi-country support

### Why local-first?
- No external dependencies = faster, more reliable
- Works offline
- No API rate limits or costs
- User data stays on their machine

### Why MCP?
- One-click installation for end users
- Works with multiple AI tools (future)
- Standard for AI-native workflows
