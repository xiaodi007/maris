import { useState, useEffect } from "react";
import { Form, Input, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  useAccounts,
  useSuiClient,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { graphql } from "@mysten/sui/graphql/schemas/2024.4";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import SelectTokenModal from "../../../components/SelectTokenModal";
import "./index.css";

import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import DonutChart from "../../../components/DonutChart";
import VestingInfoModal from "../../../components/VestingInfoModal";
dayjs.extend(isBetween);

export default function VestManager() {
  const [searchValue, setSearchValue] = useState("");
  const [sureAddress, setSureAddress] = useState("");
  const [vestingSchedules, setVestingSchedules] = useState([]);
  const [currentVesting, setCurrentVesting] = useState({});
  const [loading, setLoading] = useState(false);
  const [vestingInfoModalVisible, setVestingInfoModalVisible] = useState(false);
  const [form] = Form.useForm();

  const client = useSuiClient();
  const [account] = useAccounts();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const walletAddress = account?.address;

  const getStatus = (data) => {
    const currentTime = Date.now(); // 获取当前时间的毫秒数
    const startTimestamp = parseInt(data.start_timestamp_ms, 10);
    const cliffTimestamp = parseInt(data.cliff_timestamp_ms, 10);
    const finalTimestamp = parseInt(data.final_timestamp_ms, 10);

    if (currentTime < startTimestamp) {
      return "locked"; // 当前时间在 start_timestamp_ms 之前
    } else if (currentTime >= startTimestamp && currentTime < cliffTimestamp) {
      return "cliffed"; // 当前时间在 start_timestamp_ms 和 cliff_timestamp_ms 之间
    } else if (currentTime >= cliffTimestamp && currentTime < finalTimestamp) {
      return "releasing"; // 当前时间在 cliff_timestamp_ms 和 final_timestamp_ms 之间
    } else {
      return "releasing"; // 当前时间在 final_timestamp_ms 之后
    }
  };

  const calculateLockDuration = (startTimestamp, endTimestamp) => {
    const start = dayjs(parseInt(startTimestamp, 10));
    const end = dayjs(parseInt(endTimestamp, 10));

    const months = end.diff(start, "month"); // 计算月数
    const days = end.diff(start, "day"); // 计算天数
    const hours = end.diff(start, "hour"); // 计算小时

    // 根据条件返回相应的结果
    if (months > 0) {
      return `${months} months`;
    } else if (days > 0) {
      return `${days} days`;
    } else if (hours > 0) {
      return `${hours} hours`;
    } else {
      return "< hour"; // 如果时间差小于一小时
    }
  };

  const { data: ownObjects1 } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: [sureAddress],
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!sureAddress, // Only run the query if selectMintCoin.address is defined
    }
  );

  // 监听查询结果
  useEffect(() => {
    if (ownObjects1) {
      const schedules = ownObjects1.map((item) => {
        const temp = item.data?.content?.fields;
        const { start_timestamp_ms, cliff_timestamp_ms } = temp || {};
        const status = getStatus(temp);
        return {
          ...temp,
          status,
          symbol: temp?.coin_type?.split("::")?.[2],
          lockupDuration: calculateLockDuration(
            start_timestamp_ms,
            cliff_timestamp_ms
          ),
        };
      }) || [];
      message.destroy();
      setLoading(false);
      
      setVestingSchedules(schedules);
      setCurrentVesting(schedules[0]);
      setVestingInfoModalVisible(true); // 打开弹窗
    }
  }, [ownObjects1]);
  
  const onSearch = () => {
    if (!searchValue) return;
    if(currentVesting?.id) {
      setVestingInfoModalVisible(true)
      return
    }
    setSureAddress(searchValue);
    setLoading(true);
    message.loading("Loading...");
    setTimeout(() => {
      message.destroy();
      setLoading(false);
    }, 10 * 1000);
    // setVestingInfoModalVisible(true);
    // setCurrentVesting(data);
  };

  const handleCancel = () => {
    setVestingInfoModalVisible(false)
  };
  // 取消锁定
  const handleClaim = async () => {
    const tx = new Transaction();
    tx.setGasBudget(100000000);

    const { coin_type, id } = currentVesting || {};
    tx.moveCall({
      target:
        "0x1cb16f568d8bfd055ba2d692d3c110bc8a7d4b7841b28c4f39e05e6f39b385ff::vesting_lock::claim_linear_vested",
      typeArguments: [coin_type],
      arguments: [tx.object(id?.id), tx.object("0x6")],
    });

    // Dry run
    tx.setSender(account.address);
    const dryRunRes = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
    });

    if (dryRunRes.effects.status.status === "failure") {
      message.error(dryRunRes.effects.status.error);
      return;
    }

    // // Execute
    signAndExecuteTransaction(
      {
        transaction: tx,
      },
      {
        onSuccess: async (txRes) => {
          const finalRes = await client.waitForTransaction({
            digest: txRes.digest,
            options: {
              showEffects: true,
            },
          });

          message.success("Tx Success!");
          setVestingInfoModalVisible(false);
        },
        onError: (err) => {
          message.error(err.message);
        },
      }
    );
  };

  return (
    <div className="px-10 py-[200px] flex flex-col justify-center">
      <Input.Search
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="input search id"
        enterButton="Search"
        size="large"
        style={{ width: "80%", height: "90px" }}
        onSearch={onSearch}
        loading={loading}
      />
      {!vestingSchedules?.length && (
        <div className="text-2xl">No Vesting Schedule</div>
      )}
      {/* 查看对话框 */}
      <VestingInfoModal
        visible={vestingInfoModalVisible}
        data={currentVesting}
        isClaim={true}
        onClose={handleCancel}
        onClaim={handleClaim}
      />
    </div>
  );
}
