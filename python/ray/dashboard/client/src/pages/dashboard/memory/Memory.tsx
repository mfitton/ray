import {
  Box,
  Button,
  createStyles,
  FormControl,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  Theme,
  Typography,
} from "@material-ui/core";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getMemoryTable,
  MemoryGroupByKey,
  MemoryTableResponse,
  stopMemoryTableCollection,
} from "../../../api";
import { StoreState } from "../../../store";
import { dashboardActions } from "../state";
import MemoryRowGroup from "./MemoryRowGroup";
const groupTitle = (groupKey: string, groupBy: MemoryGroupByKey) => {
  if (groupBy === "node") {
    return `Node ${groupKey}`;
  }
  if (groupBy === "stack_trace") {
    return `Stack trace ${groupKey}`;
  }
  if (groupBy === "") {
    return "All entries";
  }
  return "Unknown Group";
};

const MEMORY_POLLING_INTERVAL_MS = 4000;

const useMemoryInfoStyles = makeStyles((theme: Theme) =>
  createStyles({
    pauseButton: {
      margin: theme.spacing(1),
      padding: theme.spacing(1),
      float: "right",
    },
    select: {
      minWidth: "7em",
    },
  }),
);

const memoryInfoSelector = (state: StoreState) => ({
  tab: state.dashboard.tab,
  memoryTable: state.dashboard.memoryTable,
  shouldObtainMemoryTable: state.dashboard.shouldObtainMemoryTable,
});

const fetchMemoryTable = (
  groupByKey: MemoryGroupByKey,
  setResults: (mtr: MemoryTableResponse) => void,
) => {
  return async () => {
    const resp = await getMemoryTable(groupByKey);
    setResults(resp);
  };
};

const MemoryInfo: React.FC<{}> = () => {
  const { memoryTable } = useSelector(memoryInfoSelector);
  const dispatch = useDispatch();

  const [paused, setPaused] = useState(false);
  const pauseButtonIcon = paused ? <PlayArrowIcon /> : <PauseIcon />;

  const classes = useMemoryInfoStyles();
  const [groupBy, setGroupBy] = useState<MemoryGroupByKey>("node");

  // Set up polling memory data
  const fetchData = useCallback(
    fetchMemoryTable(groupBy, (resp) =>
      dispatch(dashboardActions.setMemoryTable(resp)),
    ),
    [groupBy],
  );
  const intervalId = useRef<any>(null);
  useEffect(() => {
    if (!intervalId.current && !paused) {
      fetchData();
      intervalId.current = setInterval(fetchData, MEMORY_POLLING_INTERVAL_MS);
    } else if (intervalId.current && paused) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, [paused, fetchData]);

  if (!memoryTable) {
    return (
      <Typography variant="h3" align="center">
        Loading memory information
      </Typography>
    );
  }

  const children = Object.entries(
    memoryTable.group,
  ).map(([groupKey, memoryGroup]) => (
    <MemoryRowGroup
      groupKey={groupKey}
      groupTitle={groupTitle(groupKey, groupBy)}
      entries={memoryGroup.entries}
      summary={memoryGroup.summary}
      initialExpanded={false}
      initialVisibleEntries={10}
    />
  ));
  return (
    <Box>
      <FormControl>
        <InputLabel shrink id="group-by-label">
          Group by
        </InputLabel>
        <Select
          labelId="group-by-label"
          value={groupBy}
          className={classes.select}
          onChange={(e: any) => setGroupBy(e.target.value)}
          color="primary"
          displayEmpty
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value={"node"}>Node IP Address</MenuItem>
          <MenuItem value={"stack_trace"}>Stack Trace</MenuItem>
        </Select>
      </FormControl>
      <Button
        color="primary"
        className={classes.pauseButton}
        onClick={() => {
          if (!paused) {
            stopMemoryTableCollection();
          }
          setPaused(!paused);
        }}
      >
        {pauseButtonIcon}
        {paused ? "Resume Collection" : "Pause Collection"}
      </Button>
      {children}
    </Box>
  );
};

export default MemoryInfo;
