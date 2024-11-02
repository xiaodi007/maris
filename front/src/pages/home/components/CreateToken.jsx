import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Upload,
  Button,
  Typography,
  InputNumber,
  Switch,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import {
  useCurrentAccount,
  useAccounts,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiObjectId } from "@mysten/sui/utils";
import initMoveByteCodeTemplate from "@mysten/move-bytecode-template";
import { generateBytecode } from "../create-coin-utils";

import ToggleSwitch from "../../../components/ToggleSwitch";

export default function CreateToken() {
  const [selectedValue, setSelectedValue] = useState("");
  const [isDropTreasury, setIsDropTreasury] = useState(true);
  const [isMetaDataMut, setIsMetaDataMut] = useState(false);
  const [form] = Form.useForm();
  //   const account = useCurrentAccount();
  const client = useSuiClient();
  const [account] = useAccounts();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // useEffect(() => {
  //   if (isDropTreasury) {
  //     setIsMetaDataMut(true);
  //   }
  // }, [isDropTreasury]);

  const coinTypeOptions = [
    { name: "Simple Coin", value: "simpleCoin" },
    { name: "Regulated Coin", value: "RegionalCoin" },
  ];

  const onFinish = async (values) => {
    const { iconUrl, iconFiles, ...reset } = values;
    const file = values.iconFiles?.[0]?.originFileObj;

    let newIconUrl = iconUrl; // 默认使用原来的 iconUrl

    if (file) {
        const blobId = await handleUpload(file);
        if (blobId) {
            newIconUrl = `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`;
            console.log("Uploaded file blob ID:", blobId);
        }
    } else {
        console.log("No file selected");
        return;
    }
    
    const params = {
      ...reset,
      iconUrl: newIconUrl,
      // coinType: "RegionalCoin",
      coinType: selectedValue || coinTypeOptions[0].value,
      isDropTreasury,
      isMetaDataMut,
    };

    
    handleTx(params);
  };

  async function handleTx(coinMeta) {
    const tx = new Transaction();
    tx.setGasBudget(1000000000)
    const coinDetails = await client.getCoins({
      owner:  account.address,
      coinType: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
    });
    // console.log(coinDetails)
    const amountToTrans = 5 * 10 ** 6;
    const filteredData = coinDetails.data.filter(
      (item) => parseInt(item.balance) > 1000000
    );
    console.log(filteredData);
    // console.log(showAddress)
    const coinIn = filteredData[0].coinObjectId;
    const coinInObj = tx.object(coinIn);
    // console.log(coinInObj);
    const usdcInput = tx.splitCoins(coinInObj, [amountToTrans]);

    await initMoveByteCodeTemplate("/pkg/move_bytecode_template_bg.wasm");
    const updated = await generateBytecode(coinMeta);

    const [upgradeCap] = tx.publish({
      modules: [[...updated]],
      dependencies: [normalizeSuiObjectId("0x1"), normalizeSuiObjectId("0x2")],
    });
    tx.transferObjects([upgradeCap], account.address);
    tx.transferObjects([usdcInput], '0xde5448c74d811c5409041537078665ab8497a28fb125a95d7d8a12300cc655d5');
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
          
          const packageId = finalRes.effects.created?.find(
            (item) => item.owner === "Immutable"
          )?.reference.objectId;
          message.success("Tx Success!");
        },
        onError: (err) => {
          message.error(err.message);
          console.log(err);
        },
      }
    );
  }

  const normFile = (e) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };
  const handleUpload = async (file) => {
    try {
        const response = await fetch(`https://publisher.walrus-testnet.walrus.space/v1/store?epochs=1`, {
            method: 'PUT',
            body: file,
        }); 

        if (response.status === 200) {
            const info = await response.json();
            const blobId = info.newlyCreated.blobObject.blobId;
            message.success('Upload successful!');
            return blobId;
        } else {
            throw new Error('Something went wrong when storing the blob!');
        }
    } catch (error) {
        console.error('Error uploading the file:', error);
        message.error('Failed to upload the file.');
        return undefined;
    }
};

  const handleToggleChange = (value) => {
    setSelectedValue(value);
    console.log("Selected value:", value); // 打印选中的值
  };

  return (
    <div className="pb-10">
      <div className="py-4 text-[40px] text-center">CREATE COIN</div>
      <div className="w-[700px] m-auto p-8 bg-white">
        <ToggleSwitch options={coinTypeOptions} onChange={handleToggleChange} />
        <div className="mt-2 mb-6 text-[24px]">Coin Generator</div>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            decimals: 9,
            isMetaDataMut: true,
          }}
        >
          <div className="mb-2">1.Code Details</div>
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please input the coin name!" },
              {
                min: 2,
                max: 32,
                message: "Name must be between 2 and 32 characters",
              },
              {
                pattern: /^[a-zA-Z]*$/,
                message: "Name can only contain letters",
              },
            ]}
          >
            <Input placeholder="Eg. Sui" />
          </Form.Item>

          <Form.Item
            name="symbol"
            label="Coin Symbol"
            rules={[
              { required: true, message: "Please input the coin symbol!" },
              {
                min: 5,
                max: 8,
                message: "Symbol must be between 2 and 8 characters",
              },
              {
                pattern: /^[a-zA-Z]*$/,
                message: "Symbol can only contain letters",
              },
            ]}
          >
            <Input placeholder="Eg. SUI" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: "Please input the description!" },
            ]}
          >
            <Input.TextArea placeholder="Eg. Some description about the coin" />
          </Form.Item>

          <div className="mb-2">2.Add Coin Image</div>
          <Form.Item name="iconUrl" label="Coin Image URL">
            <Input placeholder="Eg. https://sui.com/images/logo.png" />
          </Form.Item>

          <Form.Item
            name="iconFiles"
            label="Or Upload Image"
            valuePropName="fileList"
            getValueFromEvent={normFile}
          >
            <Upload
              beforeUpload={() => false}
              multiple={false}
              style={{ width: "100%" }}
            >
              <Button icon={<UploadOutlined />}>
                Drop your file here or upload
              </Button>
            </Upload>
          </Form.Item>

          <div className="mb-2">3.Coin Features</div>
          <Form.Item
            name="decimals"
            label="Coin Decimals"
            rules={[
              {
                required: true,
                message: "Please input the number of decimals!",
              },
            ]}
          >
            <InputNumber
              min={0}
              placeholder="Eg. 9"
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="mintAmout"
            label="Total Supply"
            rules={[
              { required: true, message: "Please input the total supply!" },
            ]}
          >
            <InputNumber
              min={0}
              placeholder="Your total coin supply"
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* <Form.Item name="isMetaDataMut"> */}
          <div className="flex justify-between items-center mb-5">
            <div>
              <div>Revoke Update (Immutable)</div>
              <div className="text-gray-500">Cant to update token metadata</div>
            </div>
            <Switch value={isMetaDataMut} onChange={setIsMetaDataMut} />
          </div>

          {/* <Form.Item name="isDropTreasury"> */}
          <div className="flex justify-between items-center mb-10">
            <div>
              <div>Revoke Treasury cap (Immutable)</div>
              <div className="text-gray-500">
                After generator coin, you cant do anything about the coin
              </div>
            </div>
            <Switch value={isDropTreasury} onChange={setIsDropTreasury} />
          </div>
          {/* </Form.Item> */}

          {!account && (
            <div className="text-center mb-6">
              <Button danger size="large">
                Please, Connect Your Wallet
              </Button>
            </div>
          )}
          <Form.Item>
            <div className="text-center">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                disabled={!account}
              >
                Generate Coin
              </Button>
            </div>
            <div className="text-center">
            Total Fees: 5 USDC
              </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
