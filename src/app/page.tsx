"use client"

import React, { useState } from "react";
import { ReactGrid, Column, Row, CellChange, TextCell, Id, MenuOption, SelectionMode } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import orders from "@/utils/data.json";
import moment from "moment";
import { CommentCellTemplate } from "@/components/commentCellTemplate";

interface IOrderDetails {
  orderid: string;
  order_date: Date;
  region: string;
  name: string;
  item: string;
  quantity: number;
  unitcost: number;
  total: number;
  comment?: Partial<Record<keyof Omit<IOrderDetails, 'comment'>, string>> & Record<string, string>;
}

export interface CommentTextCell extends TextCell {
  comment?: string;
}

const getOrderDetails = (): IOrderDetails[] => {
  return orders.map(order => ({
    ...order,
    order_date: new Date(order.order_date),
    quantity: Number(order.quantity),
    unitcost: Number(order.unitcost),
    total: Number(order.total)
  }));
};

const getColumns = (): Column[] => [
  { columnId: "orderid", width: 150, resizable: true },
  { columnId: "order_date", width: 150, resizable: true },
  { columnId: "region", width: 150, resizable: true },
  { columnId: "name", width: 150, resizable: true },
  { columnId: "item", width: 150, resizable: true },
  { columnId: "quantity", width: 150, resizable: true },
  { columnId: "unitcost", width: 150, resizable: true },
  { columnId: "total", width: 150, resizable: true },

];

const headerRow: Row = {
  rowId: "header",
  cells: [
    { type: "header", text: "Order ID" },
    { type: "header", text: "Order Date" },
    { type: "header", text: "Region" },
    { type: "header", text: "Name" },
    { type: "header", text: "Item" },
    { type: "header", text: "Quantity" },
    { type: "header", text: "Unit Cost" },
    { type: "header", text: "Total" }
  ]
};

const makeCommentCell = (text: string, comment?: string): CommentTextCell => ({
  type: "text",
  text,
  comment
});

const getRows = (orders: IOrderDetails[]): Row[] => [
  headerRow,
  ...orders.map<Row>((order, idx) => ({
    rowId: idx,
    cells: [
      makeCommentCell(order.orderid, order.comment?.orderid),
      makeCommentCell(moment(order.order_date).format("DD MMM YYYY"), order.comment?.order_date),
      makeCommentCell(order.region, order.comment?.region),
      makeCommentCell(order.name, order.comment?.name),
      makeCommentCell(order.item, order.comment?.item),
      makeCommentCell(String(order.quantity), order.comment?.quantity),
      makeCommentCell(String(order.unitcost), order.comment?.unitcost),
      makeCommentCell(String(order.total), order.comment?.total)
    ]
  }))
];

function Home() {
  const [orderDetails, setOrderDetails] = useState<IOrderDetails[]>(getOrderDetails());
  const [columns, setColumns] = useState<Column[]>(getColumns());
  const [cellChangesIndex, setCellChangesIndex] = useState(() => -1);
  const [cellChanges, setCellChanges] = useState<CellChange<TextCell>[][]>(() => []);
  // Track popover state
  const [commentPopover, setCommentPopover] = useState<{
    rowIndex: number;
    colId: keyof IOrderDetails;
    oldValue: string;
    newValue: string;
  } | null>(null);

  const [commentText, setCommentText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "quarter" | "half" | "year">("all");

  const applyNewValue = (
    changes: CellChange<TextCell>[],
    prevOrders: IOrderDetails[],
    usePrevValue: boolean = false,
    commentsMap?: Record<string, string>
  ): IOrderDetails[] => {
    const updatedOrders = prevOrders.map(order => ({ ...order, comment: { ...order.comment } }));

    changes.forEach(change => {
      const orderIndex = Number(change.rowId);
      const fieldName = change.columnId as keyof IOrderDetails;
      const newCell = usePrevValue ? change.previousCell : change.newCell;
      let newValue: any = newCell.text;

      // Formatting
      if (fieldName === "order_date") {
        newValue = moment(new Date(newValue)).format("DD MMM YYYY");
      } else if (["quantity", "unitcost", "total"].includes(fieldName)) {
        newValue = Number(newValue);
      }

      // Apply value
      (updatedOrders[orderIndex] as any)[fieldName] = newValue;

      if (["quantity", "unitcost"].includes(fieldName as string)) {
        console.log({ qty: updatedOrders[orderIndex].quantity, cost: updatedOrders[orderIndex].unitcost, total: +updatedOrders[orderIndex].quantity * updatedOrders[orderIndex].unitcost });

        updatedOrders[orderIndex].total =
          +((+updatedOrders[orderIndex].quantity) * (+updatedOrders[orderIndex].unitcost)).toFixed(2);
      }

      // Add comment if provided from handleChanges
      if (commentsMap && commentsMap[`${orderIndex}-${fieldName}`]) {
        updatedOrders[orderIndex].comment = updatedOrders[orderIndex].comment || {};
        updatedOrders[orderIndex].comment![fieldName] = commentsMap[`${orderIndex}-${fieldName}`];
      }
    });

    return updatedOrders;
  }

  // Column Resize
  const handleColumnResize = (ci: Id, width: number) => {
    setColumns((prevColumns) => {
      const columnIndex = prevColumns.findIndex(el => el.columnId === ci);
      const resizedColumn = prevColumns[columnIndex];
      const updatedColumn = { ...resizedColumn, width };
      prevColumns[columnIndex] = updatedColumn;
      return [...prevColumns];
    });
  }

  // contextMenu
  const simpleHandleContextMenu = (
    selectedRowIds: Id[],
    selectedColIds: Id[],
    selectionMode: SelectionMode,
    menuOptions: MenuOption[]
  ): MenuOption[] => {
    if (selectionMode === "row") {
      menuOptions = [
        ...menuOptions,
        {
          id: "removeOrder",
          label: "Remove",
          handler: () => {
            setOrderDetails(prevOrder => {
              return [...prevOrder.filter((order, idx) => !selectedRowIds.includes(idx))]
            })
          }
        }
      ];
    }
    return menuOptions;
  }

  // Undo/Redo Changes
  const undoChanges = (
    changes: CellChange<TextCell>[],
    prevOrder: IOrderDetails[]
  ): IOrderDetails[] => {
    const updated = applyNewValue(changes, prevOrder, true);
    setCellChangesIndex(cellChangesIndex - 1);
    return updated;
  };

  const redoChanges = (
    changes: CellChange<TextCell>[],
    prevOrder: IOrderDetails[]
  ): IOrderDetails[] => {
    const updated = applyNewValue(changes, prevOrder);
    setCellChangesIndex(cellChangesIndex + 1);
    return updated;
  };

  const handleUndoChanges = () => {
    if (cellChangesIndex >= 0) {
      setOrderDetails((prevOrder) =>
        undoChanges(cellChanges[cellChangesIndex], prevOrder)
      );
    }
  };

  const handleRedoChanges = () => {
    if (cellChangesIndex + 1 <= cellChanges.length - 1) {
      setOrderDetails((prevOrder) =>
        redoChanges(cellChanges[cellChangesIndex + 1], prevOrder)
      );
    }
  };

  const handleChanges = (changes: CellChange[]) => {
    const textCellChanges = changes.filter(
      (change): change is CellChange<TextCell> => change.newCell.type === "text"
    );

    if (textCellChanges.length === 0) return;

    const commentsMap: Record<string, string> = {};

    const validChanges = textCellChanges.filter(change => {
      const rowIndex = Number(change.rowId);
      const colId = change.columnId as keyof IOrderDetails;
      const oldValue = change.previousCell.text;
      const newValue = change.newCell.text;

      if (oldValue !== newValue) {
        const comment = prompt(`Enter a comment for change: "${oldValue}" → "${newValue}"`);
        if (comment && comment.trim() !== "") {
          commentsMap[`${rowIndex}-${colId}`] = comment;
          return true;
        } else {
          alert("Change cancelled because comment was not provided.");
          return false;
        }
      }
      return false;
    });

    if (validChanges.length > 0) {
      setOrderDetails(prevOrders => applyNewValue(validChanges, prevOrders, false, commentsMap));
    }
  };

  const filteredOrders = orderDetails.filter(order => {
    // Search filter
    const searchMatch = searchTerm
      ? Object.values(order).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
      : true;

    // Date filter
    const orderMonth = moment(order.order_date).month(); // 0-based month
    const orderQuarter = Math.floor(orderMonth / 3) + 1;
    const orderHalf = orderMonth < 6 ? 1 : 2;

    let dateMatch = true;
    if (dateFilter === "quarter") {
      const currentQuarter = Math.floor(moment().month() / 3) + 1;
      dateMatch = orderQuarter === currentQuarter;
    } else if (dateFilter === "half") {
      const currentHalf = moment().month() < 6 ? 1 : 2;
      dateMatch = orderHalf === currentHalf;
    } else if (dateFilter === "year") {
      dateMatch = moment(order.order_date).year() === moment().year();
    } else if (!["quarter", "half", "year", "all"].includes(dateFilter)) {
      dateMatch = moment(order.order_date).year() === +dateFilter;
    }

    return searchMatch && dateMatch;
  });

  const rows = getRows(filteredOrders);

  return (
    <div className="flex item-center m-4 p-6 " onKeyDown={(e) => {
      if ((e.ctrlKey) || e.metaKey) {
        switch (e.key) {
          case "z":
            handleUndoChanges();
            return;
          case "y":
            handleRedoChanges();
            return;
        }
      }
    }}>
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search..."
            className="border p-2 rounded w-64"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
          >
            <option value="all">All Dates</option>
            <option value="quarter">Quarter</option>
            <option value="half">Half Year</option>
            <option value="year">This Year</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>


        <ReactGrid rows={rows}
          columns={columns}
          onCellsChanged={handleChanges}
          onColumnResized={handleColumnResize}
          onContextMenu={simpleHandleContextMenu}
          customCellTemplates={{ text: new CommentCellTemplate() }}
          stickyTopRows={1}
          enableRowSelection
          enableColumnSelection
          enableFillHandle
          enableGroupIdRender
          enableFullWidthHeader
        />
      </div>
    </div>
  )
}

export default Home;