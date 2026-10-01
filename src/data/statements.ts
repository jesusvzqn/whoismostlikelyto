// Pool of "Who's most likely to...?" statement completions, themed for an
// IT/Product team (engineering, product, Jira, estimation, meetings, etc).
// Kept as plain sentence fragments; the UI prepends the fixed header.
export const STATEMENTS: readonly string[] = [
  "approve a pull request without actually reading the diff",
  "open a 2,000-line PR titled \"small fix\"",
  "leave a \"TODO: fix later\" comment that's still there two years on",
  "introduce a merge conflict and blame the rebase",
  "change data in production thinking they are in staging",
  "argue passionately about a code style nobody else cares about",
  "leave their laptop open and unlocked at someone else's desk",
  "assign a ticket with no description and no context",
  "overengineer a solution for a problem that didn't exist yet",
  "forget to update the ticket status after finishing the actual work",
  "go straight from Thursday's after-work drinks to Friday's stand-up without sleeping",
  "forget to unmute and talk for a full minute before noticing",
  "accidentally share the wrong screen and reveal an online shopping basket",
  "notice there is free food in the kitchen before anyone else",
  "turn a five-minute stand-up update into a ten-minute monologue",
  "leave a message in Slack unread for one whole day and then respond like nothing happened",
  "spend two hours automating a task that would have taken five minutes to do manually",
  "wear headphones with zero audio playing just so people don't talk to them",
  "know the exact lore and office gossip from three departments away",
  "forget to turn off their camera during a very audible personal call",
] as const;
