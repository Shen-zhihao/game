# 第一章实现与验证记录

日期：2026-10-15。App `0.1.0 (1)`；存档结构 `1`；内容 `ch1.1`。

本文记录实际实现，优先于技术草案的拟建目录、Swift / Kotlin 自建桥、短码认证与纯原生文件流提案。长篇设计不因第一章原型完成而视为已完成。

## 实际范围

| 部分     | 当前实现                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 探索     | 晨芽镇、一号路、苔丘镇、微芒林、枝叶道馆；碰撞、切图、NPC、遭遇、线索、倒木、救援、两道馆机关与首馆主                             |
| 战斗     | 单打、4 技能 / PP、速度和优先度、命中 / 暴击、18 属性、状态、能力等级、固定 AI 意图、捕捉、逃跑、主动换人 / 免费补位、输赢结算    |
| 战斗交互 | 上方战场、下方对话与四格指令；分类背包、物品数量和说明；用药先选对象；六格队伍、HP / 状态、能力详情与确认换人；逐条战报、逐层取消 |
| 成长     | 六维与个体值、4 条经验曲线、升级、学招、等级 / 道具进化、取消后重试、成长记录、技能回忆                                           |
| 内容     | 250 种形态与 135 条进化边接入规则 / 图鉴；第一章只提供部分物种的获取路径                                                          |
| 美术     | 5 张地图、战斗背景、16 格精灵、四向 16 帧主角、8 NPC、8 道具图标与应用图标                                                        |
| 存档     | SQLite WAL、3 槽、每槽 10 份历史、覆盖保护备份、最多 100 条导入回执；Web 为 localStorage                                          |
| 传档     | 原生 NSD / Bonjour + TCP、QR 公钥配对、NaCl box 加密、分块确认 / 校验、目标槽位预览、原子提交与回执查询                           |

精灵目前为独立正面图加待机位移，我方使用翻转图；037 / 038 暂共用一格。全部独立背面、攻击 / 倒下 / 捕捉动作、音频、250 种最终美术和独立完整图鉴 PDF 尚未完成。地图是完整背景，角色 / NPC / 机关独立分层，复杂树冠前景尚未拆层。

人物用原生 Animated 做 140ms 相邻格插值，镜头同步跟随；每方向 4 帧，停步即停止走路循环，地图不逐帧重建 React 树。未取得物理手机帧率、温度与内存峰值数据，不能宣称性能目标达标。

## 模块与依赖

```text
App.tsx, index.ts               启动、标题、菜单和会话
src/game/{model,rules}.ts       数据、能力、属性、成长与进化
src/game/{battle,engine}.ts     战斗、行动前置校验、探索与剧情
src/content/                   内容适配、技能、道具和逻辑地图
src/components/                地图、角色、精灵、战斗菜单
src/screens/                   探索、战斗、菜单、存档、传档
src/persistence/               快照、校验、串行仓库与平台驱动
src/transfer/                  配对加密、协议状态机与原生网络
tools/native-audit-entry.tsx    独立原生自检入口，正式游戏不导入
tests/                         内容、规则、存档、TCP 协议回归
```

锁定 Expo 57、RN 0.86.3、React 19.2.3、Skia 2.6.2、Reanimated 4.5.1 / Worklets 0.10.1、TCP 6.4.3、Zeroconf 0.17.6，完整补丁见 lockfile。Skia 原生启动需要兼容动画依赖，不能只依据 Web 预览判断可运行。

iOS 配置 `enableSceneSupport: true`。Xcode / SDK 27 实际启动要求 UIScene 生命周期，修复后已运行原生自检。[Expo BuildProperties](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)、[兼容动画依赖](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/)。

## 存档与协议

`save_slots`、`save_history`、`protected_backups`、`import_receipts` 保存有界 JSON。写入串行化，预期 revision 比较防止旧异步覆盖；SQLite 独占事务成功后才显示保存成功。快照包含 lineage / branch / revision / parent revision、版本和确切 payload 的 SHA-256。

业务载荷保留完整战斗决策点、AI 意图、随机数和学招 / 进化队列；恢复不会重新发奖。只接受相同 schema / content 版本。Zod 与业务检查拒绝未知版本、哈希不符、非法坐标、未知内容 ID、悬空引用、重复实例、异常 HP / 等级和过大载荷。18×18 共用表按完整属性数组叠乘，免疫优先，本系只加成一次。

发现服务 `_stargrovesave._tcp` 使用动态端口；广播只含协议版本、会话 ID 和别名。发送方选设备后扫描配对码，也可直接扫描 / 粘贴完整码连接。二维码固定临时 Curve25519 公钥和 256 bit 会话凭据，2 分钟失效。搜索 20 秒、连接 10 秒超时。进入后台取消，瞬时 inactive 权限提示不取消。

预览、确认、数据和回执通过 TweetNaCl box（Curve25519 / XSalsa20-Poly1305）加密；双向独立 nonce 计数，校验会话并拒绝反射 / 重放。单块 64 KiB、逐块 ACK、整体上限 8 MiB、帧缓冲有界。块经原生 TCP 库 JS API 传递，**尚非早期草案的原生文件流**；极限文件内存需设备实测。

接收端先预览选槽，长度 / SHA / 版本 / 业务校验成功后，在同一事务写存档、保护备份与回执。提交前失败保留旧档；提交中取消等待事务结果；提交后 ACK 丢失可重连 QUERY_STATUS 查询，避免重复导入。不按设备时间或徽章数自动选档、不合并分支。

## 验证与边界

`pnpm check` 的 TypeScript、ESLint 与 26 个测试通过：250 / 115 / 135 内容约束、324 项相克与免疫、多属性极端倍率、全部进化、不复活昏厥、捕捉与结算幂等、战斗恢复、无效用药不消耗、后排治疗、主动换人 / 免费补位、三种初始伙伴通过合法命令完成首章、存档故障 / 冲突 / 历史、真实 Node TCP 多块加密传输与错误配对 / 重放 / 分帧限制。

独立原生自检在 Android API 35 ARM64 模拟器与 iOS 27 iPhone 18 Pro 模拟器的 Release / Hermes 中通过 7 项。报告 `exports/android-native-audit.json`、`exports/ios-native-audit.json`：捕捉、成长进化、真实 SQLite 重开、事务中途 SQL 失败回滚、实际原生 TCP 多块加密传输、原档备份与回执。使用独立 `native-audit-receiver.db`，不修改玩家库。

浏览器在 844×390 下检查连续行走、松键停步、战斗技能 / 治疗、满血拒绝、分类选物 / 投球、取消、捕捉与确认换人。刷新后恢复战斗和队伍；截图在 `exports/battle-*.jpg`。网页证据不代替原生或真机。

iOS Release 正式入口已安装并启动，标题页实际画面确认通过。修复了整屏背景与安全区内容宽度不一致造成的右侧亮条：背景和遮罩铺满窗口，文字与按钮分别加安全区边距；战斗和菜单也分别保护操作区。修复后在 iPhone 18 Pro 模拟器检查，截图为 `exports/ios-fullscreen-fixed.jpg`。

| 待验收   | 当前边界                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| 真机矩阵 | Android → Android、iPhone → iPhone、Android → iPhone、iPhone → Android 尚未实测；loopback 不证明 Wi-Fi 互传 |
| 真实网络 | 首次权限、拒绝 / 撤销、扫码、mDNS / 双栈地址、热点 / VPN / 访客隔离、断线 / 后台切换待实测                  |
| 安装发布 | Android 为本地测试签名 Release；iOS 模拟器 App 不能安装到 iPhone，未交付签名 IPA；未上架                    |
| 长期使用 | 极限仓库 / 存档、低空间、升级保档、耗电、帧率与内存峰值待真机验证                                           |
| 内容演出 | 后续七馆、250 独立形象、独立背面 / 动作与完整音频待制作                                                     |

## 构建与复现

Node 22 / pnpm 10；Android SDK 36 / JDK 21 或 Xcode / CocoaPods。执行 `pnpm install --frozen-lockfile` 后生成对应工程。不要在原生构建运行期间 prebuild。

```sh
pnpm exec expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleRelease
```

配置有效 `ANDROID_HOME` / `JAVA_HOME`。APK 在 `android/app/build/outputs/apk/release/app-release.apk`。正式入口是 `index.ts`，不传审计 init script；检查实际 APK 原生库仅 `arm64-v8a`。

```sh
pnpm exec expo prebuild --platform ios --no-install
cd ios
pod install
ENTRY_FILE=../index.ts NODE_ENV=production xcodebuild \
  -workspace app.xcworkspace -scheme app -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ../exports/ios-build CODE_SIGNING_ALLOWED=NO build
```

审计构建在 Android 加 `-I ../tools/native-audit.init.gradle`，iOS 改为 `ENTRY_FILE=../tools/native-audit-entry.tsx`。安装启动后写 Documents 的 `native-audit.json` 和日志 `STARGROVE_NATIVE_AUDIT`。审计完成须恢复正式入口重新构建安装，不能交付审计包。

实测 Xcode 27 的模拟器窗口由 Device Hub 提供。模拟器包不能改成 IPA 冒充真机包。实际产物、大小、校验值、签名用途与源码摘要见 `exports/artifacts.json`，构建日志和截图保存在同目录。开发文件尚未提交，不能引用不存在的提交作为交付来源。
