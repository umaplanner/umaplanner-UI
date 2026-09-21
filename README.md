# UmaPlanner
A tool for managing PvP related data and results
Here's the links to the [Design](./docs/design.md) and [Roadmap](./docs/roadmap.md) of the project.

## Planned Core Features
Possible future improvements is listed in **bold**, and features in *italics* are not fully decided how it should be implemented.

- [x] Creation of teams for CM/LoH
    - [ ] **During uma selection, it should show the proc time of their unique on the track**
- [ ] Have public stats for uma/card usage for each event
- [ ] Create a discord bot for easier acces/sharing of plans
- [ ] Auth using Discord
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
- [ ] Should show PvP events their most common individual uma, team comp, and allow to further inspect.
- [ ] Past PvP events should have the "most common" locked in this page even if users change their plans

**PvP Planner Page**
A page where you can plan and organize your umas, support cards, and lineages. 
The content of this page should change based on the event selected in the navbar.
- [ ] Should allow users to private their plans if they wish
- [ ] Should allow users to share their plans as an anonymous user if they wish

## Roadmap

### v0.1.0 - Basic planner
- [x] PvP Planner page 
    - [x] Only own team for the next couple of CMs
    - [x] Umas only in searchable dropdowns
    - [x] Implement cache as the initial method for saving

### v0.2.0 - Expand PvP Planner
- [x] Dynamic list of events in the navbar
    - [x] All events until current JP server events
    - [x] Track conditions for each event
    - [x] Focus on Current event, if no current event, focus on next
- [x] Implement indexedDB for saving plans locally 

### v0.2.1 - Improve uma search
- [x] Implement images and a new search instead of dropdowns for uma selection
    - [x] Use cloudflare r2 or similar object storage for images

### v0.3.0 - Auth
- [x] Auth using Discord
- [ ] Save and retrieve based on auth
- [ ] Design and implement database

### v0.3.1 - Introduce skills 
- [ ] Implement skill and stat selection for each uma 
    - should work kind of like the simulators
- [ ] include skill images in "public" section 


### v0.4.0 - Implement failsafes/logic
- [ ] Implement failsafes for users to not lose their plans if they accidentally close the page or refresh
- [ ] Ensure it is not possible to select several of the same uma in a team
- More to come


### v1.0.0 - PvP Overview
- PvP Overview page
    - Show PvP events their most common uma and most common uma
    - Past PvP events should have the "most common" locked even if users change their plans

### v1.1.0 - Team sharing, Privacy, and Discord bot
- Implement discord bot (as a separate repository) for easier access/sharing of plans

### v1.2.0 - Settings
- [ ] Implement settings for:
    - [ ] Private/Anonymous plans
    - [ ] Past events toggle
    - [ ] How far into the future the event selector should look
    - More to come
