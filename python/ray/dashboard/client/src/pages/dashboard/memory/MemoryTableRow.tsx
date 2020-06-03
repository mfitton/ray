import { TableRow } from "@material-ui/core";
import React from "react";
import { MemoryTableEntry } from "../../../api";
import { StyledTableCell } from "../../../common/TableCell";

type Props = {
  memoryTableEntry: MemoryTableEntry;
  key: string;
};

export const MemoryTableRow = (props: Props) => {
  const { memoryTableEntry, key } = props;
  const object_size =
    memoryTableEntry.object_size === -1
      ? "?"
      : `${memoryTableEntry.object_size}  B`;
  const memoryTableEntryValues = [
    "", // Padding
    memoryTableEntry.node_ip_address,
    memoryTableEntry.pid,
    memoryTableEntry.type,
    memoryTableEntry.object_id,
    object_size,
    memoryTableEntry.reference_type,
    memoryTableEntry.call_site,
  ];
  return (
    <TableRow hover key={key}>
      {memoryTableEntryValues.map((value, index) => (
        <StyledTableCell key={`${key}-${index}`}>{value}</StyledTableCell>
      ))}
    </TableRow>
  );
};
