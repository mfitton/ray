import {
  FormControl,
  FormHelperText,
  Input,
  InputLabel,
  Typography,
} from "@material-ui/core";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Actor, ActorState } from "../../../newApi";
import { StoreState } from "../../../store";
import Actors from "./ActorEntries";

const actorMatchesSearch = (
  actor: Actor,
  nameFilter: string,
): boolean => {
  // Performs a case insensitive search for the name filter string within the
  // actor and all of its nested subactors.
  const actorTitles = getNestedActorTitles(actor);
  const loweredNameFilter = nameFilter.toLowerCase();
  const match = actorTitles.find(
    (actorTitle) => actorTitle.toLowerCase().search(loweredNameFilter) !== -1,
  );
  return match !== undefined;
};

const getNestedActorTitles = (actor: Actor): string[] => {
  const actorTitle = actor.actorTitle;
  const titles: string[] = actorTitle ? [actorTitle] : [];
  // state of -1 indicates an actor data record that does not have children.
  if (actor.state === ActorState.Invalid) {
    return titles;
  }
  const children = actor["children"];
  if (children === undefined || Object.entries(children).length === 0) {
    return titles;
  }
  const childrenTitles = Object.values(children).flatMap((actor) =>
    getNestedActorTitles(actor),
  );
  return titles.concat(childrenTitles);
};

const actorsSelector = (state: StoreState) => {
  const nodeSummaries = state.dashboard.nodeSummaries?.data;
  if (nodeSummaries) {
    return nodeSummaries.summaries.flatMap(nodeSummary =>
      Object.values(nodeSummary.actors)
    );
  }
  return null;
};

const LogicalView: React.FC<{}> = () => {
  const [nameFilter, setNameFilter] = useState("");
  const actors = useSelector(actorsSelector);

  if (!actors) {
    return <Typography color="textSecondary">Loading...</Typography>;
  }
  const filteredActors = actors.filter(
      actor =>
        actorMatchesSearch(actor, nameFilter)
    );

  return (
    <div>
      {filteredActors.length === 0 ? (
        <Typography color="textSecondary">No actors found.</Typography>
      ) : (
        <div>
          <FormControl>
            <InputLabel htmlFor="actor-name-filter">Actor Search</InputLabel>
            <Input
              id="actor-name-filter"
              aria-describedby="actor-name-helper-text"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
            />
            <FormHelperText id="actor-name-helper-text">
              Search for an actor by name
            </FormHelperText>
          </FormControl>
          <Actors actors={filteredActors} />
        </div>
      )}
    </div>
  );
};

export default LogicalView;
