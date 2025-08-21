import * as React from "react";
import {
    Cell,
    CellTemplate,
    Compatible,
    Uncertain,
    UncertainCompatible,
    isNavigationKey,
    getCellProperty,
    isAlphaNumericKey,
    keyCodes
} from "@silevis/reactgrid";

export interface CommentTextCell extends Cell {
    type: "text";
    text: string;
    comment?: string;
}

export class CommentCellTemplate implements CellTemplate<CommentTextCell> {
    // validate / normalize incoming cell -> must include text and value per Compatible<T>
    getCompatibleCell(uncertainCell: Uncertain<CommentTextCell>): Compatible<CommentTextCell> {
        const text = getCellProperty(uncertainCell, "text", "string");
        const value = Number.NaN; // no numeric representation for text cells
        return { ...uncertainCell, text, value, comment: (uncertainCell).comment ?? "" };
    }

    // handle key / pointer events - enable edit mode on typing, Enter or pointer (double click)
    handleKeyDown(
        cell: Compatible<CommentTextCell>,
        keyCode: number,
        ctrl: boolean,
        shift: boolean,
        alt: boolean
    ) {
        if (!ctrl && !alt && isAlphaNumericKey(keyCode)) return { cell, enableEditMode: true };
        return { cell, enableEditMode: keyCode === keyCodes.POINTER || keyCode === keyCodes.ENTER };
    }

    // update when ReactGrid asks to merge changes
    update(cell: Compatible<CommentTextCell>, cellToMerge: UncertainCompatible<CommentTextCell>): Compatible<CommentTextCell> {
        return this.getCompatibleCell({
            ...cell,
            text: cellToMerge.text ?? cell.text,
            comment: cellToMerge.comment ?? cell.comment
        });
    }

    // render display OR editor when isInEditMode === true
    render(
        cell: Compatible<CommentTextCell>,
        isInEditMode: boolean,
        onCellChanged: (cell: Compatible<CommentTextCell>, commit: boolean) => void
    ): React.ReactNode {
        if (!isInEditMode) {
            return (
                <span className={cell.comment ? "cell-with-comment" : ""} title={cell.comment}>
                    <span>{cell.text}</span>
                </span>
            );
        }

        // Edit mode: an <input> that reports changes back to ReactGrid
        return (
            <input
                ref={(el) => {
                    if (el) el.focus();
                }}
                className="w-full h-full border-none outline-none font-inherit bg-transparent box-border"                
                defaultValue={cell.text}
                onChange={(e) =>
                    onCellChanged(this.getCompatibleCell({ ...cell, text: e.currentTarget.value }), false)
                }
                onBlur={(e) =>
                    onCellChanged(this.getCompatibleCell({ ...cell, text: e.currentTarget.value }), true)
                }
                onKeyDown={(e) => {
                    const keyCode = (e).keyCode ?? 0;
                    if (e.key === "Enter") {
                        onCellChanged(this.getCompatibleCell({ ...cell, text: (e.currentTarget as HTMLInputElement).value }), true);
                    } else if (e.key === "Escape") {
                        onCellChanged(this.getCompatibleCell({ ...cell, text: cell.text }), true);
                    } else {
                        // prevent grid from handling navigation / typing propagation while editing
                        if (isAlphaNumericKey(keyCode) || isNavigationKey(keyCode)) e.stopPropagation();
                    }
                }}
            />
        );
    }
}
