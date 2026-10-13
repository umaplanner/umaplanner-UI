/**
 * Public results codec facade.
 *
 * Keep storage and API callers dependent on this stable module while the
 * implementation remains isolated under data/codecs.
 */

export {
  normalizeEventResults,
  serializeEventResults,
} from "./codecs/eventResultsCodec";
export { isTeamResults, normalizeTeamResults } from "./codecs/teamResultsCodec";
export {
  normalizeTeamTicketCounts,
  isTeamTicketBuildResults,
  normalizeTeamTicketBuildResults,
} from "./codecs/ticketResultsCodec";
export {
  isTeamBuildOverrides,
  isTeamBuildAssignments,
  normalizeTeamBuildAssignments,
} from "./codecs/buildAssignmentsCodec";
