import {
  createStyles,
  TableCell,
  TableRow,
  Theme,
  withStyles,
  WithStyles,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import RemoveIcon from "@material-ui/icons/Remove";
import classNames from "classnames";
import React from "react";
import {
  MemoryTableEntry,
  MemoryTableResponse,
  MemoryTableSummary,
} from "../../../api";
import {
  descendingComparator
} from "../../../common/tableUtils";
import MemorySummary from "./MemorySummary";
import { MemoryTableRow } from "./MemoryTableRow";

const styles = (theme: Theme) =>
  createStyles({
    cell: {
      padding: theme.spacing(1),
      textAlign: "center",
    },
    expandCollapseCell: {
      cursor: "pointer",
    },
    expandCollapseIcon: {
      color: theme.palette.text.secondary,
      fontSize: "1.5em",
      verticalAlign: "middle",
    },
    extraInfo: {
      fontFamily: "SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace",
      whiteSpace: "pre",
    },
  });

type Props = {
  groupKey: string;
  memoryTableGroups: MemoryTableResponse["group"];
  initialExpanded: boolean;
};

type State = {
  expanded: boolean;
};

class MemoryRowGroup extends React.Component<
  Props & WithStyles<typeof styles>,
  State
> {
  state: State = {
    expanded: this.props.initialExpanded,
  };

  toggleExpand = () => {
    this.setState((state) => ({
      expanded: !state.expanded,
    }));
  };

  render() {
    const { classes, groupKey, memoryTableGroups } = this.props;
    const { expanded } = this.state;

    const features = [
      "node_ip_address",
      "pid",
      "type",
      "object_id",
      "object_size",
      "reference_type",
      "call_site",
    ];

    const memoryTableGroup = memoryTableGroups[groupKey];
    const entries: Array<MemoryTableEntry> = memoryTableGroup["entries"];
    const summary: MemoryTableSummary = memoryTableGroup["summary"];

    return (
      <React.Fragment>
        <TableRow hover>
          <TableCell
            className={classNames(classes.cell, classes.expandCollapseCell)}
            onClick={this.toggleExpand}
          >
            {!expanded ? (
              <AddIcon className={classes.expandCollapseIcon} />
            ) : (
              <RemoveIcon className={classes.expandCollapseIcon} />
            )}
          </TableCell>
          {features.map((feature, index) => (
            <TableCell className={classes.cell} key={index}>
              {// TODO(sang): For now, it is always grouped by node_ip_address.
              feature === "node_ip_address" ? groupKey : ""}
            </TableCell>
          ))}
        </TableRow>
        {expanded && (
          <React.Fragment>
            <MemorySummary
              initialExpanded={false}
              memoryTableSummary={summary}
            />
            {entries.map((memoryTableEntry, index) => {
              return <MemoryTableRow 
                memoryTableEntry={memoryTableEntry}
                key={`${index}`}
                cellClassName={classes.cell}
              />
            })}
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(MemoryRowGroup);
