import React from "react";
import { GPUStats } from "../../../../api";
import { MiBRatio } from "../../../../common/formatUtils";
import UsageBar from "../../../../common/UsageBar";
import { getWeightedAverage, sum } from "../../../../common/util";
import {
  ClusterFeatureComponent,
  Node,
  NodeFeatureComponent,
  WorkerFeatureComponent,
} from "./types";

const nodeGRAMAvgUtilization = (node: Node) => {
  const utilization = (gpu: GPUStats) => gpu.memory_used / gpu.memory_total;
  if (node.gpus.length === 0) {
    return NaN;
  }
  const utilizationSum = sum(node.gpus.map((gpu) => utilization(gpu)));
  const avgUtilization = utilizationSum / node.gpus.length;
  // Convert to a percent before returning
  return avgUtilization * 100;
};

const clusterGRAMUtilization = (nodes: Array<Node>) => {
  const utils = nodes
    .map((node) => ({
      weight: node.gpus.length,
      value: nodeGRAMAvgUtilization(node),
    }))
    .filter((util) => !isNaN(util.value));
  if (utils.length === 0) {
    return NaN;
  }
  return getWeightedAverage(utils);
};

type NodeGRAMUtilizationEntryProps = {
  gpu: GPUStats;
}

const NodeGRAMUtilizationEntry = ({gpu}: NodeGRAMUtilizationEntryProps) => {
  const gpuRenderName = gpu.name;
  const utilPercent = gpu.memory_used / gpu.memory_total;
  const memUsedRepr = `${gpu.memory_used.toFixed(1)} MB`;
  const memTotalRepr = `${gpu.memory_total.toFixed(1)} MB`;
  const utilPercentRepr = `(${utilPercent.toFixed(1)}%)`
  const gpuUsageText = `${memUsedRepr} / ${memTotalRepr} ${utilPercentRepr}`
  return (
  <div>
    <b>{gpuRenderName}: </b>
    <UsageBar
      percent={utilPercent}
      text={gpuUsageText}
    />
  </div>);
}

export const ClusterGRAM: ClusterFeatureComponent = ({ nodes }) => {
  const clusterAverageUtilization = clusterGRAMUtilization(nodes);
  return (
    <div style={{ minWidth: 60 }}>
      {isNaN(clusterAverageUtilization) ? (
        <b>No GPUs</b>
      ) : (
        <UsageBar
          percent={clusterAverageUtilization}
          text={`${clusterAverageUtilization.toFixed(1)}%`}
        />
      )}
    </div>
  );
};

export const NodeGRAM: NodeFeatureComponent = ({ node }) => {
  if (!node.gpus || node.gpus.length === 0) {
    return (
      <div style={{ minWidth: 60 }}>
        <b>No GPUs</b>
      </div>
    );
  }
  return (
    <div style={{ minWidth: 60 }}>
        {node.gpus.map(gpu => <NodeGRAMUtilizationEntry gpu={gpu} />)}
    </div>
  );
};

export const WorkerGRAM: WorkerFeatureComponent = ({ worker, node }) => {
  const workerProcessPerGPU = node.gpus
    .map((gpu) => gpu.processes)
    .map((processes) =>
      processes.find((process) => process.pid === worker.pid),
    );
  const workerUtilPerGPU = workerProcessPerGPU.map(
    (proc) => proc?.gpu_memory_usage || 0,
  );
  const totalNodeGRAM = sum(node.gpus.map((gpu) => gpu.memory_total));
  const usedGRAM = sum(workerUtilPerGPU);
  return (
    <div style={{ minWidth: 60 }}>
      {node.gpus.length === 0 ? (
        <b>No GPUs</b>
      ) : (
        <UsageBar
          percent={100 * (usedGRAM / totalNodeGRAM)}
          text={MiBRatio(usedGRAM, totalNodeGRAM)}
        />
      )}
    </div>
  );
};
