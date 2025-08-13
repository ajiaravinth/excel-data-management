"use client"

import React, { useState } from "react";
import { ReactGrid, Column, Row, CellChange, TextCell, Id, MenuOption, SelectionMode } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import orders from "@/utils/data.json";
import moment from "moment";
import { CommentCellTemplate } from "@/components/commentCellTemplate";
import { Popover, PopoverContent } from "@radix-ui/react-popover";

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
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [commentPopover, setCommentPopover] = useState<{
    rowIndex: number;
    colId: keyof IOrderDetails;
    oldValue: string;
    newValue: string;
  } | null>(null);

  const [commentText, setCommentText] = useState("");

  const rows = getRows(orderDetails);

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
        updatedOrders[orderIndex].total =
          +updatedOrders[orderIndex].quantity * +updatedOrders[orderIndex].unitcost;
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

    // const firstChange = textCellChanges[0]; // Handle one change at a time
    // const rowIndex = Number(firstChange.rowId);
    // const colId = firstChange.columnId as keyof IOrderDetails;
    // const oldValue = firstChange.previousCell.text;
    // const newValue = firstChange.newCell.text;



    // if (oldValue !== newValue) {
    //   console.log({oldValue, newValue});
    //   setCommentPopover({ rowIndex, colId, oldValue, newValue });
    //   setPopoverOpen(true);
    // }

    const commentsMap: Record<string, string> = {};

    const validChanges = textCellChanges.filter(change => {
      const rowIndex = Number(change.rowId);
      const colId = change.columnId as keyof IOrderDetails;
      const oldValue = change.previousCell.text;
      const newValue = change.newCell.text;

      if (oldValue !== newValue) {
        setCommentPopover({ rowIndex, colId, oldValue, newValue });
        setCommentText("");
        setPopoverOpen(true);
      }
      return false;
    });

    if (validChanges.length > 0) {
      setOrderDetails(prevOrders => applyNewValue(validChanges, prevOrders, false, commentsMap));
    }
  };

  const saveComment = () => {
    if (!commentText.trim()) {
      alert("Comment is required");
      return;
    }

    if (commentPopover) {
      const { rowIndex, colId, newValue } = commentPopover;
      const changes: CellChange<TextCell>[] = [
        {
          rowId: rowIndex,
          columnId: colId,
          previousCell: { type: "text", text: orderDetails[rowIndex][colId] as any },
          newCell: { type: "text", text: newValue },
          type: "text"
        },
      ];

      const commentsMap = {
        [`${rowIndex}-${colId}`]: commentText.trim(),
      };

      setOrderDetails(prev => applyNewValue(changes, prev, false, commentsMap));
      setCommentPopover(null);
      setCommentText("");
    }
  };

  return (
    <div>

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

<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverContent className="p-4 w-64">
          <label className="block mb-2 font-medium">
            Enter Comment for change: 
            <span className="text-gray-500">
              {commentPopover?.oldValue} → {commentPopover?.newValue}
            </span>
          </label>
          <input
            type="text"
            className="border p-2 w-full"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveComment();
              }
            }}
          />
          <button
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
            onClick={saveComment}
          >
            Save
          </button>
        </PopoverContent>
      </Popover>
      </div>
    </div>
  )
}

export default Home;