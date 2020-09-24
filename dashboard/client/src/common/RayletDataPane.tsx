import { Box, Grid, makeStyles, Typography } from "@material-ui/core";
import React, { ReactChild } from "react";
import { RayletData } from '../api';

type RayletDataPaneProps = {
  data: RayletData;
};

const RayletDataTooltips = {
  objectStoreAvailableMemory: "",
  objectStoreNumLocalObjects: "",
  objectManagerUnfulfilledPushRequests: "",
  objectManagerWaitRequests: "",
  objectManagerPullRequests: "",

  numSubscribedTasks: "",
  numPendingTasks: "",
  numPlaceableTasks: "",
  numWaitingTasks: "",
  numRunningTasks: "",
  numInfeasibleTasks: "",
  numRequiredTasks: "",
  numRequiredObjects: "",

  taskCountReceived: "",
  liveActors: "",
  restartingActors: "",
  deadActors: "The number of dead actors on this node",
  numWorkers: "The number of workers on this node",

}

const RayletDataPane: React.FC<RayletDataPaneProps> = () => {
  <Box>
    <Grid>
      <Typography variant="overline">Object Store</Typography>
    </Grid>  
  </Box>
}

export default RayletDataPane;