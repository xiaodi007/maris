// ModalWithTable.js
import React from 'react';
import { Modal, Table, Button } from 'antd';

const SelectTokenModal = ({ visible, onClose, data, onSelect }) => {
    const [selectedRow, setSelectedRow] = React.useState(null);

    const columns = [
        {
            title: 'Address',
            dataIndex: 'address',
            key: 'address',
            render: (text) => {
                return text?.slice(0, 20) + '.........' + text?.slice(-20);
            }
        },
        // Add more columns as needed
    ];

    const rowSelection: any = {
        type: 'radio', // Set to single selection
        onChange: (selectedRowKeys, selectedRows) => {
            setSelectedRow(selectedRows[0]);
        },
    };

    const handleConfirm = () => {
        onSelect(selectedRow); // Send selected row data back to the parent component
        onClose(); // Close the modal
    };

    return (
        <Modal
            title="Select an Item"
            visible={visible}
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                <Button
                    key="confirm"
                    type="primary"
                    onClick={handleConfirm}
                    disabled={!selectedRow}
                >
                    Confirm
                </Button>,
            ]}
        >
            <Table
                columns={columns}
                dataSource={data || []}
                rowSelection={rowSelection}
                rowKey={(record) => record?.address}
                pagination={false}
            />
        </Modal>
    );
};

export default SelectTokenModal;
