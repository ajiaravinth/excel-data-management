"use client"

import React, { useState } from "react";
import { ReactGrid, Column, Row, CellChange, TextCell, Id, MenuOption, SelectionMode } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import orders from "@/utils/data.json";
import moment from "moment";
import { CommentCellTemplate } from "@/components/commentCellTemplate";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";
import { Dropdown } from "primereact/dropdown";
import CommentDialog from "@/components/CommentDialog";

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

enum RangeOptions {
  CY = "CY", //current year
  All = "ALL", // All data
  QY = "QY", //Quaterly
  HY = "HY", // Half yearly
  Prev1 = "2024", // 2024 records
  Prev2 = "2023", // 2023 records
}

interface IFilterByDateRangeOptions {
  name: string;
  code: string;
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

const dateRageFilter: IFilterByDateRangeOptions[] = [
  { name: 'All', code: 'ALL' },
  { name: 'Quarterly', code: 'QY' },
  { name: 'Half Yealy', code: 'HY' },
  { name: 'Current Year', code: 'CY' },
  { name: '2024', code: '2024' },
  { name: '2023', code: '2023' },
];

function Home() {
  const [orderDetails, setOrderDetails] = useState<IOrderDetails[]>(getOrderDetails());
  const [columns, setColumns] = useState<Column[]>(getColumns());
  const [cellChangesIndex, setCellChangesIndex] = useState(() => -1);
  const [cellChanges, setCellChanges] = useState<CellChange<TextCell>[][]>(() => []);
  // Track popover state 

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<IFilterByDateRangeOptions>({ name: "All", code: RangeOptions.All });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [comment, setComment] = useState("");
  const [pendingChange, setPendingChange] = React.useState<CellChange<TextCell> | null>(null);

  //Graph
  // const monthlyData = React.useMemo(() => {
  //   const monthlyTotals: Record<string, number> = {};

  //   orderDetails.forEach(order => {
  //     const month = moment(order.order_date).format("MMM YYYY");
  //     monthlyTotals[month] = (monthlyTotals[month] || 0) + order.total;
  //   });

  //   return Object.entries(monthlyTotals).map(([month, total]) => ({
  //     month,
  //     total,
  //   }));
  // }, [orderDetails]);

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

    const firstChange = textCellChanges[0];
    const oldValue = firstChange.previousCell.text;
    const newValue = firstChange.newCell.text;

    if (oldValue !== newValue) {
      setPendingChange(firstChange);

      // update orderDetails so grid shows edited value
      setOrderDetails((prev) =>
        prev.map((row, idx) =>
          idx === Number(firstChange.rowId)
            ? { ...row, [firstChange.columnId]: newValue }
            : row
        )
      );

      setIsOpen(true);
    }
  };

  const handleSave = () => {
    if (pendingChange && comment.trim()) {
      const rowIndex = Number(pendingChange.rowId);
      const colId = pendingChange.columnId as keyof IOrderDetails;

      const commentsMap: Record<string, string> = {
        [`${rowIndex}-${colId}`]: comment,
      };

      setOrderDetails((prevOrders) =>
        applyNewValue([pendingChange], prevOrders, false, commentsMap)
      );
    } else {
      if (pendingChange) {
        const rowIndex = Number(pendingChange.rowId);
        const oldValue = pendingChange.previousCell.text;

        setOrderDetails((prev) =>
          prev.map((row, idx) =>
            idx === rowIndex
              ? { ...row, [pendingChange.columnId]: oldValue }
              : row
          )
        );
      }
    }
    cleanup();
  }

  const handleCancel = () => {
    if (pendingChange) {
      const rowIndex = Number(pendingChange.rowId);
      const oldValue = pendingChange.previousCell.text;

      // rollback to old value
      setOrderDetails((prev) =>
        prev.map((row, idx) =>
          idx === rowIndex
            ? { ...row, [pendingChange.columnId]: oldValue }
            : row
        )
      );
    }
    cleanup();
  };

  const cleanup = () => {
    setIsOpen(false);
    setComment("");
    setPendingChange(null);
  };

  const filteredOrders = orderDetails.filter(order => {
    // Search filter
    const searchMatch = searchTerm
      ? Object.values(order).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
      : true;

    const orderMonth = moment(order.order_date).month();
    const orderQuarter = Math.floor(orderMonth / 3) + 1;
    const orderHalf = orderMonth < 6 ? 1 : 2;
    const filterCode = dateFilter.code;

    let dateMatch = true;
    if (filterCode === RangeOptions.QY) {
      const currentQuarter = Math.floor(moment().month() / 3) + 1;
      dateMatch = orderQuarter === currentQuarter;
    } else if (filterCode === RangeOptions.HY) {
      const currentHalf = moment().month() < 6 ? 1 : 2;
      dateMatch = orderHalf === currentHalf;
    } else if (filterCode === RangeOptions.CY) {
      dateMatch = moment(order.order_date).year() === moment().year();
    } else if (![RangeOptions.All, RangeOptions.CY, RangeOptions.QY, RangeOptions.HY].includes(filterCode as RangeOptions)) {
      dateMatch = moment(order.order_date).year() === +filterCode;
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
      <div className="flex flex-col gap-4 mb-4 w-full">
        {/* {monthlyData.length > 0 && (
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Monthly Order Ratio</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )} */}


        <div className="flex gap-4">
          <InputText
            type="text"
            placeholder="Search..."
            className="border p-2 rounded w-100"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Dropdown value={dateFilter} onChange={e => setDateFilter(e.target.value)} options={dateRageFilter} optionLabel="name"
            placeholder="Select a Date" className="w-100" />
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

        <CommentDialog
          visible={isOpen}
          onHide={() => setIsOpen(false)}
          pendingChange={pendingChange}
          comment={comment}
          setComment={setComment}
          handleSave={handleSave}
          handleCancel={handleCancel}
        />

        {/* {isOpen && pendingChange && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h2 className="text-lg font-semibold mb-4">Add Comment</h2>
              <p className="text-sm mb-2">
                <strong>Editing:</strong> {pendingChange.columnId}
              </p>
              <p className="text-sm mb-4">
                <strong>Old Value:</strong> {pendingChange.previousCell.text} <br />
                <strong>New Value:</strong> {pendingChange.newCell.text}
              </p>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border p-2 rounded w-full h-24 mb-4"
                placeholder="Enter your comment..."
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )} */}
        {/* {isOpen && popoverPosition && (
          <div
            style={{
              position: "absolute",
              top: popoverPosition.top,
              left: popoverPosition.left,
              zIndex: 9999,
            }}
          >
            <Popover open={true}>
              <PopoverContent className="rounded-md bg-white shadow-lg p-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter comment"
                  className="border p-1 rounded"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={handleSave} className="px-2 py-1 bg-green-500 text-white rounded">
                    Save
                  </button>
                  <button onClick={handleCancel} className="px-2 py-1 bg-gray-300 rounded">
                    Cancel
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )} */}
        {/* 
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverPortal>
            <PopoverContent
              className="bg-white p-4 rounded shadow-md border w-72"
              side="bottom"
              align="center"
            >
              <h3 className="font-semibold mb-2">Enter Comment</h3>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border rounded p-2 w-full mb-3"
                placeholder="Why did you change this?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
              </div>
              <PopoverArrow className="fill-white" />
            </PopoverContent>
          </PopoverPortal>
        </Popover> */}
      </div>
    </div>
  )
}

export default Home;