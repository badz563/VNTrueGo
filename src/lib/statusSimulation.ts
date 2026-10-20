import type { Destination } from "./types";
import type { StatusSimulation } from "./storage";

// Browser-local scenarios never alter partner data or the shared database.
export function applyStatusSimulations(destinations: Destination[], simulations: StatusSimulation[]): Destination[] {
  const revisions = new Map(simulations.map(item => [item.destinationId,item.revision]));
  return destinations.map(destination => {
    const revision = revisions.get(destination.id);
    return revision === undefined ? destination : {
      ...destination,status: "closed" as const,statusRev: Math.max(destination.statusRev + (destination.statusSource === "visitor-simulation" ? 0 : 1),revision),
      statusSource: "visitor-simulation",statusUpdatedAt: new Date().toISOString()
    };
  });
}
