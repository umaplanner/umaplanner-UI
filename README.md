# UmaPlanner
A tool for managing PvP related data and results
Here's the links to the [Design](./docs/design.md) and [Roadmap](./docs/roadmap.md) of the project.

## Planned Core Features
Possible future improvements is listed in **bold**, and features in *italics* are not fully decided how it should be implemented.

- [x] Creation of teams for CM/LoH
    - [ ] **During uma selection, it should show the proc time of their unique on the track**
- [ ] Have public stats for uma/card usage for each event
- [ ] Create a discord bot for easier acces/sharing of plans
- [x] Auth using Discord
- [ ] ***Simulation of most impactful skills for each CM***

## Design and Setup of the Project

Basic description of the different pages and their functionalities.

### Navbar
The navbar is the core of this tool. It should contain a selector for the events which should change the content of all the pages.

### Pages
**Home Page**
The main dashboard where you can see an overview of upcoming events.
- [ ] The ability to pin teams or events is planned for future updates.

**PvP Overview**
A page dedicated to the general plans the community has for whichever pvp event is selected.
- [x] Should show PvP events their most common individual uma, team comp, and allow to further inspect.
- [ ] Past PvP events should have the "most common" locked in this page even if users change their plans

**PvP Planner Page**
A page where you can plan and organize your umas, support cards, and lineages. 
The content of this page should change based on the event selected in the navbar.
- [ ] Should allow users to private their plans if they wish
- [ ] Should allow users to share their plans as an anonymous user if they wish

