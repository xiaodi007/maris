import React, { useState } from "react";
import { FileOutlined, FireFilled, PieChartOutlined } from "@ant-design/icons";
import { Layout, Menu, theme, Popover } from "antd";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import WormholeConnect from "@wormhole-foundation/wormhole-connect";

import "./index.less";
import CreateToken from "./components/CreateToken";
import TokenMint from "./components/TokenMint";
import UpdateMetadata from "./components/UpdateMetadata";
import RevokeAuthority from "./components/RevokeAuthority";
import UpdateAddress from "./components/UpdateAddress";
import LockCreate from "./components/LockCreate";
import VestCreate from "./components/VestCreate";
import VestManager from "./components/VestManager";
import VestClaim from "./components/VestClaim";
import WormholeModal from "../../components/WormholeModal";

const { Header, Content, Footer, Sider } = Layout;

function getItem(label, key, icon, children) {
  return {
    key,
    icon,
    children,
    label,
    style: {
      marginBottom: 18,
    },
  };
}

// Define your menu items
const items = [
  getItem("Token Manager", "/token-manager", <PieChartOutlined />, [
    getItem("Create Token", "/token-manager/create-token"),
    getItem("Token Mint", "/token-manager/token-mint"),
    getItem("Update Token Metadata", "/token-manager/update-metadata"),
    getItem("Revoke Freeze Authority", "/token-manager/revoke-auth"),
    getItem("Regulated Coin Deny List", "/token-manager/regcoin"),
  ]),
  getItem("Vesting & Lock Tokens", "/vest-lock", <FileOutlined />, [
    getItem("Token Lock", "/toekn", null, [
      getItem("Creator", "/lock/create"),
      getItem("Manager", "/vest/manager"),
    ]),
    getItem("Token Vesting", "/vest", null, [
      getItem("Creator", "/vest/create"),
      getItem("Manager", "/vest/manager"),
    ]),
    getItem("Claim", "/vest/claim"),
    // getItem("Revoke Freeze Authority", "/token-manager/revoke-auth"),
    // getItem("Regcoin Add Remove Deny Address", "/token-manager/regcoin"),
  ]),
];

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openWormhole, setOpenWormhole] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the current path selected in the menu
  const selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        theme="light"
        width={300}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        <div
          className="py-5 flex justify-center items-center"
          onClick={() => navigate("/enter")}
        >
          <FireFilled
            style={{ marginRight: 6, color: "#2cb4cd", fontSize: 32 }}
          />
          <span className="text-[26px] text-gray-950 font-bold">Maris</span>
        </div>
        <Menu
          selectedKeys={[selectedKey]} // Set selected key based on current path
          mode="inline"
          defaultMotions
          defaultOpenKeys={["/token-manager"]}
          items={items}
          onClick={(e) => navigate("" + e.key)} // Handle navigation on menu click
        />
      </Sider>
      <Layout>
        <div className="absolute right-5 top-3 flex items-center">

          <Popover content={<div className="bg-black"><WormholeConnect theme={{background: "#2cb4cd"}}/></div>} title="Title" trigger="hover">
            <div
              className="mr-3 px-3 py-[10px] rounded-md bg-gray-100 cursor-pointer"
            >
              WormholeConnect
            </div>
          </Popover>
          <ConnectButton
            connectText="CONNECT WALLET"
            style={{ background: "#2cb4cd", color: "white", boxShadow: "none" }}
          />
        </div>
        <Header
          style={{ background: colorBgContainer, padding: "40px 0" }}
        ></Header>
        <Content style={{ height: "calc(100vh - 80px)", overflowY: "auto" }}>
          {/* Only Content area changes based on route */}
          <Routes>
            <Route path="/" element={<div>Welcome to Maris</div>} />
            {/* token-manager */}
            <Route
              path="/token-manager/create-token"
              element={<CreateToken />}
            />
            <Route path="/token-manager/token-mint" element={<TokenMint />} />
            <Route
              path="/token-manager/update-metadata"
              element={<UpdateMetadata />}
            />
            <Route
              path="/token-manager/revoke-auth"
              element={<RevokeAuthority />}
            />
            <Route path="/token-manager/regcoin" element={<UpdateAddress />} />
            {/* vest lock */}
            <Route path="/lock/create" element={<LockCreate />} />
            <Route path="/vest/create" element={<VestCreate />} />
            <Route path="/vest/manager" element={<VestManager />} />
            <Route path="/vest/claim" element={<VestClaim />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: "center" }}>
          Ant Design ©{new Date().getFullYear()} Created by Ant UED
        </Footer>
      </Layout>
      <WormholeModal
        visible={openWormhole}
        onClose={() => setOpenWormhole(false)}
      />
    </Layout>
  );
};

export default App;
