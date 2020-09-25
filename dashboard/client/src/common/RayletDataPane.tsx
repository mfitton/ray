import { Box, Grid, makeStyles, Typography } from "@material-ui/core";
import React, { ReactChild } from "react";
import { RayletData } from '../api';
import LabeledDatum from '../../../../python/ray/new_dashboard/client/src/common/LabeledDatum';

type RayletDataPaneProps = {
  data: RayletData;
};

const rayletDataConsts = {
  objectStore: [
    {
      key: "objectStoreAvailableMemory",
      tooltip: "Available memory in the Object store in MB",
      label: "Available Mem"
    },
    {
      key: "objectStoreNumLocalObjects",
      tooltip: "The number of objects stored in the plasma object store on this node.",
      label: "Num Local Objs"
    },
    {
      key: "objectManagerUnfulfilledPushRequests",
      tooltip: "Number of unfulfilled push requests for objects.",
      label: "Unfulfilled Push Req",
    },
    {
      key: "objectManagerWaitRequests",
      tooltip: "Number of pending wait requests for objects",
      label: "Obj Manager Wait Req",
    },
    {
      key: "objectManagerPullRequests",
      tooltip: "Number of active pull requests for objects",
      label: "Obj Manager Pull Req",
    },
  ],
  tasks: [
    {
      key: "numSubscribedTasks",
      label: "Num Subscribed",
      tooltip: "The number of tasks that are subscribed to object dependencies."
    },
    {
      key: "numPendingTasks",
      label: "Num Pending",
      tooltip: "The number of tasks that are pending execution."
    },
    {
      key: "numPlaceableTasks",
      label: "Num Placeable",
      tooltip: "The number of tasks in the 'placeable' state."
    },
    {
      key: "numWaitingTasks",
      label: "Num Waiting",
      tooltip: "The number of tasks in the 'waiting' state."
    },
    {
      key: "numRunningTasks",
      label: "Num Running",
      tooltip: "The number of tasks currently executing."
    },
    {
      key: "numInfeasibleTasks",
      label: "Num Infeasible",
      tooltip: "The number of tasks which cannot be scheduled on the given cluster because they require more of some resource than the cluster has in total."
    },
    {
      key: "numRequiredTasks",
      label: "Num Required Tasks",
      tooltip: "The number of tasks whose output object(s) are required by another subscribed task. These tasks must complete before the subscribing task can execute",
    },
    {
      key: "numRequiredObjects",
      label: "Num Required Objects",
      tooltip: "The number of objects that are required by a subscribed task. The tasks to create these objects must complete before the subscribed tasks can execute."
    },
    {
      key: "taskCountReceived",
      label: "Received Tasks",
      tooltip: "The total number of tasks the Ray scheduler has received."
    },
  ]
};

const RayletDataPane: React.FC<RayletDataPaneProps> = () => {
  <Box>
    <Grid container>
      <Typography variant="overline">Object Store</Typography>
      {rayletDataConsts.objectStore.map(({ key, label, tooltip }) =>
        <LabeledDatum
          key={key} />
      )}
      <Typography variant="overline">Scheduling</Typography>
      
    </Grid>  
  </Box>
}

export default RayletDataPane;