// ModalWithTable.js
import React from 'react';
import { Modal, Tag, Button, Row, Col } from 'antd';


// 状态到 Tag 的映射
const statusMap = {
    locked: { color: "red", text: "Locked" },
    cliffed: { color: "orange", text: "Cliffed" },
    releasing: { color: "blue", text: "Releasing" },
    finished: { color: "black", text: "finished" },
};

const LockInfoModal = ({ visible, onClose, data, isClaim = false, onRefound, onClaim }) => {
    const [info, setInfo] = React.useState({});

    return (
        <Modal
            title="Lock contract"
            visible={visible}
            width={600}
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                isClaim && <Button
                    key="confirm"
                    type="primary"
                    onClick={onClaim}
                >
                    Claim
                </Button>
            ]}
        >
            <div>
                {/* <div>Vesting Plan </div> */}
                <div className='mb-4'>
                    <span className="text-gray-500">To wallet: </span>
                    {data?.sender || '-'}</div>
                {(data?.revocable && !isClaim) &&
                    <div className='p-2 mb-6 inline-block border text-red-600' onClick={onRefound}>
                        End Lock contract
                    </div>
                }
                <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        Transcation Hash
                    </Col>
                    <Col span={18}>
                        {data?.id?.id || '-'}
                    </Col>
                </Row>
                {/* <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        Type
                    </Col>
                    <Col span={18}>
                        Employee
                    </Col>
                </Row> */}
                <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        Allocation
                    </Col>
                    <Col span={18}>
                        {data?.current_balance || '-'} {data?.symbol}
                    </Col>
                </Row>
                <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        Cadence
                    </Col>
                    <Col span={18}>
                        0
                    </Col>
                </Row>
                <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        Start Date
                    </Col>
                    <Col span={18}>
                        {new Date(parseInt(data?.start_timestamp_ms)).toString()}
                    </Col>
                </Row>
                
                {
                    data?.cliff_timestamp_ms &&
                    <Row className='mb-2'>
                        <Col span={6} className="text-gray-500">
                            Cliff Date
                        </Col>
                        <Col span={18}>
                            {new Date(parseInt(data?.cliff_timestamp_ms)).toString()}
                        </Col>
                    </Row>
                }
                <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        End Date
                    </Col>
                    <Col span={18}>
                        {new Date(parseInt(data?.final_timestamp_ms)).toString()}
                    </Col>
                </Row>
                <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        Lockup length
                    </Col>
                    <Col span={18}>
                        {data?.cliff_timestamp_ms ? data?.lockupDuration : 0}
                    </Col>
                </Row>
                <Row className='mb-2'>
                    <Col span={6} className="text-gray-500">
                        Status
                    </Col>
                    <Col span={18}>
                        <Tag color={statusMap[data?.status]?.color}>{statusMap[data?.status]?.text}</Tag>
                    </Col>
                </Row>
            </div>
        </Modal>
    );
};

export default LockInfoModal;
