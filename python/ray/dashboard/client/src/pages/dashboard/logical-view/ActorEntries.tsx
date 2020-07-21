import React from "react";
import { Actor, ActorState } from "../../../newApi";
import ActorEntry from "./ActorEntry";

type ActorProps = {
  actors: Actor[];
};

const ActorEntries = (props: ActorProps) => {
  const { actors } = props;
  const actorChildren = Object.values(actors)
    .sort((actor1, actor2) => {
      if (
        actor1.state === ActorState.Dead &&
        actor2.state === ActorState.Dead
      ) {
        return 0;
      } else if (actor2.state === ActorState.Dead) {
        return -1;
      } else {
        return 1;
      }
    })
    .map((actor) => <ActorEntry actor={actor} key={actor.actorId} />);
  return <>{actorChildren}</>;
};

export default ActorEntries;
