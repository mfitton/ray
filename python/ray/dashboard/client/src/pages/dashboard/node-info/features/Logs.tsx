import { Typography } from "@material-ui/core";
import React from "react";
import SpanButton from "../../../../common/SpanButton";
import { sum } from "../../../../common/util";
import {
  ClusterFeatureRenderFn,
  Node,
  NodeFeatureRenderFn,
  WorkerFeatureRenderFn,
} from "./types";

const nodeLogCount = (node: Node) =>
  node.log_count ? sum(Object.values(node.log_count)) : 0;

const ClusterLogs: ClusterFeatureRenderFn = ({ nodes }) => {
  const totalLogCount = sum(nodes.map(nodeLogCount));
  return totalLogCount === 0 ? (
    <Typography color="textSecondary" component="span" variant="inherit">
      No logs
    </Typography>
  ) : (
    <React.Fragment>
      {totalLogCount.toLocaleString()} {totalLogCount === 1 ? "line" : "lines"}
    </React.Fragment>
  );
};

export const makeNodeLogs = (
  setLogDialog: (hostname: string, pid: number | null) => void,
): NodeFeatureRenderFn => ({ node }) => {
  const logCount = nodeLogCount(node);
  return logCount === 0 ? (
    <Typography color="textSecondary" component="span" variant="inherit">
      No logs
    </Typography>
  ) : (
    <SpanButton onClick={() => setLogDialog(node.hostname, null)}>
      View all logs ({logCount.toLocaleString()}{" "}
      {logCount === 1 ? "line" : "lines"})
    </SpanButton>
  );
};

export const makeWorkerLogs = (
  setLogDialog: (hostname: string, pid: number | null) => void,
): WorkerFeatureRenderFn => ({ node, worker }) => {
  const workerLogCount = node.log_count?.[worker.pid] || 0;
  return workerLogCount !== 0 ? (
    <SpanButton onClick={() => setLogDialog(node.hostname, worker.pid)}>
      View log ({workerLogCount.toLocaleString()}{" "}
      {workerLogCount === 1 ? "line" : "lines"})
    </SpanButton>
  ) : (
    <Typography color="textSecondary" component="span" variant="inherit">
      No logs
    </Typography>
  );
};

const makeLogsFeature = (
  setLogDialog: (hostname: string, pid: number | null) => void,
) => ({
  ClusterFeatureRenderFn: ClusterLogs,
  WorkerFeatureRenderFn: makeWorkerLogs(setLogDialog),
  NodeFeatureRenderFn: makeNodeLogs(setLogDialog),
});

export default makeLogsFeature;
