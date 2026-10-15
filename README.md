# 星苔远征

React Native / Expo 原创精灵 RPG。横屏探索、回合制战斗、捕捉、成长进化与本地存档；Android 仅 `arm64-v8a`，同时实现 iOS 客户端。

当前是第一章可玩原型 `0.1.0 (1)`，内容版本 `ch1.1`。三只初始伙伴均有自动化流程走通森林救援与第一座道馆。长篇八道馆、250 种独立美术和最终完整图鉴册仍为后续目标，不能视为已交付。

## 运行

```sh
pnpm install --frozen-lockfile
pnpm web
```

打开 `http://localhost:8088`。网页支持试玩和 localStorage 本地存档，局域网发现与双机传档需要原生 App。Expo Go 不包含项目使用的 TCP / Bonjour 原生依赖。

```sh
pnpm exec expo prebuild --platform android
pnpm android
```

```sh
pnpm exec expo prebuild --platform ios
pnpm ios
```

SDK 57 的 prebuild 会重新生成对应原生工程；不要将需保留的文件放在生成目录中。配置以 `app.config.ts` 为源。iOS 最低 16.4，开启 scene 支持；Android target / compile SDK 36。精确依赖见 lockfile。

## 玩法

- 方向键 / WASD 或屏幕方向区移动，Enter / Z 或 A 按钮交谈。菜单查看队伍、仓库、背包、图鉴、任务与存档。
- 晨芽镇与阿澈练习，前往一号路学习捕捉；到苔丘镇接取森林求助，收集两处线索，从南侧推动倒木，完成救援并回镇报告，再挑战道馆机关与馆主。
- 战场占据上方主体，底部四格指令为战斗、背包、精灵、逃跑。技能在同一底部区域选择，每回合逐条显示对话。
- 背包按回复药、精灵球、其他道具分类，用药先选对象再确认。取消不消耗，满血、无异常和昏厥目标不会浪费物品。主动换人占回合，倒下后的补位免费。Esc / X 和 Android 返回键逐层返回。
- 6 只队伍、360 个仓库位、3 个存档槽。每槽 10 份历史，覆盖导入前另留保护备份。
- 首次捕捉奖励成长果；升级学习技能并触发进化，取消后可以重试。镇内支持技能回忆、免费治疗，巡路员可重复训练。

## 手机间传档

两部手机安装相同版本，连接同一 Wi-Fi。接收端打开“存档互传 → 接收”；发送端搜索并选择设备，再扫描接收端配对码（或粘贴完整配对码）。接收端预览进度、选择目标槽位并确认后才传输提交。找不到设备时可直接扫描；路由器访客隔离仍会阻止直接连接。

配对码固定临时公钥和高熵会话凭据，数据通过 NaCl box 加密。接收端完成 SHA-256、版本与业务校验后，在 SQLite 事务中提交存档、保护备份和回执。另提供文件导入 / 导出备份。

Android ARM64 与 iOS 模拟器的原生自检已经通过：Hermes 捕捉 / 成长进化、SQLite 重开与故障回滚、实际原生 TCP 多块加密传档及回执。自检使用 loopback，**不等同于两部真实手机的 Wi-Fi 发现、扫码、权限与双向传档验收**；真机矩阵尚未完成。

## 检查与文档

```sh
pnpm check
pnpm format:check
pnpm exec expo install --check
git diff --check
```

- [实现与验证记录](docs/implementation.md)：实际模块、协议、构建、自检与待验收项。
- [游戏设计](docs/game-design.md)：完整长篇目标与第一章边界。
- [属性分配](docs/creature-types.md)、[成长进化](docs/creature-growth.md)、[统一数据](docs/data/creature-types.json)：250 种形态、115 个家族、135 条进化边。18 属性标准表支持任意数量不同属性叠乘，三属性及以上为本作扩展。
- [技术设计](docs/technical-design.md)：设计目标；实际 M1 调整以实现记录为准。
- [美术来源与生成提示](docs/data/art-manifest.json)：11 个实际位图及最终生成提示。

本地包、截图和验证报告在 `exports/`（不入库），来源、大小、签名用途与 SHA-256 见 `artifacts.json`。Android 本地 Release 使用开发测试签名；iOS 模拟器包不能安装到 iPhone。真机签名、物理手机验收与商店发布分别记录。
