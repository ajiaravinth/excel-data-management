import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import React from "react";

interface ICommentDialogProps {
    visible: boolean;
    onHide: () => void;
    pendingChange: any;
    comment: string;
    setComment: (value: string) => void;
    handleSave: () => void;
    handleCancel: () => void;
}

const CommentDialog: React.FC<ICommentDialogProps> = ({
    visible,
    onHide,
    pendingChange,
    comment,
    setComment,
    handleSave,
    handleCancel
}) => {
    const footer = (
        <div className="flex justify-end gap-2">
            <Button
                label="Cancel"
                className="p-button-secondary"
                onClick={handleCancel}
            />
            <Button
                disabled={!comment}
                label="Save"
                icon="pi pi-check"
                className="p-button-primary"
                onClick={handleSave}
            />
        </div>
    );

    return (
        <Dialog
            header="Add Comment"
            visible={visible}
            style={{ width: "30rem" }}
            modal
            draggable={false}
            closable={false}
            onHide={onHide}
            footer={footer}
        >
            <p className="text-sm mb-2">
                <strong>Editing:</strong> {pendingChange?.columnId}
            </p>
            <p className="text-sm mb-4">
                <strong>Old Value:</strong> {pendingChange?.previousCell?.text} <br />
                <strong>New Value:</strong> {pendingChange?.newCell?.text}
            </p>

            <InputTextarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border p-2 rounded w-full h-24"
                placeholder="Enter your comment..."
            />
        </Dialog>
    )
}

export default CommentDialog;