# BeatLuma 最简上线任务

目标：将可用产品、真实方案和必要说明发布到 beatluma.com，随后申请 Dodo Payments。BeatLuma 是产品名，Novakite Studio 是工作室商业名称。

## 本次实现

- [x] 首页、场景标签、导出品牌角标、账户标题、找回密码邮件改为 BeatLuma。
- [x] 移除旧 Logo 上未经确认的 ® 标记。
- [x] 免费开始创作、价格导航、工作室署名及全套页脚入口。
- [x] 中英文静态公开页，不需要账户或 API 即可查看。
- [x] 游客：30 秒 / 720p / 带角标。
- [x] 注册免费：3 次 / UTC 自然月，单次 5 分钟 / 720p / 带角标，3 个云端配置。
- [x] Pro 公布方案：US$7.99 / 月，1080p / 无角标，无套餐导出次数或时长上限，100 个配置。价格已按用户选择更新，可在 `src/site.js` 修改后重新构建。
- [x] 价格页说明本机渲染、设备限制、WebM/MP4 差异和配置不保存素材。
- [x] 14 天首次购买自愿退款规则及月付取消规则，保留法定消费者权利。
- [x] 注册表单加入条款/隐私入口与同意勾选。
- [x] 默认关闭旧版 Stripe 新购入口，不收款、不预售、不提前承诺 Dodo 已开通。

## 发布到公网前只需补这些真实信息

统一编辑 `src/site.js`：

- [ ] `supportEmail`：建议 `support@beatluma.com`，可转发到工作室共用收件箱 `support@novakitestudio.com`；先配置接收和回复，再填入此字段。未填写时联系页明确显示未设置，不将建议地址当作已经开通的客服地址。
- [ ] `abn`：已保留空白占位，填入真实 11 位 ABN 后重新构建即可；不会公开 TODO 或虚构号码。
- `legalName`：可选的公开经营者名称，默认不显示。不将“首页展示个人姓名”作为通用上线要求；条款、适用法律及支付平台有额外身份披露要求时，再补充。不要把商业名称误写为 Pty Ltd 公司。Dodo 私下 KYC/KYB 必须填写真实持有人/主体资料，不要上传到源码。
- [x] 月价已确认为 US$7.99。
- [ ] 确认首次购买 14 天退款规则；修改页面生成器即可。
- [ ] 核对隐私页与实际部署的托管、邮件、日志及存储行为一致；新增统计或支付服务后更新说明。

## 构建和部署

1. `npm run build`、`npm test`；后端在 `server/` 运行 `go test ./...`。
2. 使用现有 Compose 部署方式，设置 `SITE_URL=https://beatluma.com`、强数据库密码及 SMTP，保留 `BILLING_PROVIDER=none`。`SITE_URL` 不要再用 localhost，否则密码重置链接会错误。
3. 配置域名 DNS、HTTPS 与反向代理。使用现有数据库和 `resonance_mysql` 卷，不要为改名创建空数据库或删除旧卷。
4. 公网逐一访问首页和下列页面；注册、登录、游客导出、免费导出与密码邮件在完整 API 部署上验证。静态预览不包含账户 API。
5. 产品功能真正可用后，再将网址填入 Dodo 产品审核。当前代码和页面不等于审核已通过。

公开网址：

- https://beatluma.com/
- https://beatluma.com/pricing.html
- https://beatluma.com/about.html
- https://beatluma.com/contact.html
- https://beatluma.com/terms.html
- https://beatluma.com/privacy.html
- https://beatluma.com/refunds.html

## Dodo 开户资料可复用

- 产品名：BeatLuma
- 工作室商业名称：Novakite Studio（法定经营者以登记资料为准）
- 一句话介绍：Browser-based music visualization software that turns local audio into audio-reactive videos.
- 产品类型：在线软件 / SaaS
- 免费产品：已能运行的浏览器音乐可视化工具，用户自己选取合法音频
- 付费方案：BeatLuma Pro，USD 7.99，每月自动续费
- 交付方式：账户数字权限；正式支付开放时在确认付款后开通
- 素材处理：音乐、图片、视频在用户浏览器本地处理，云端只保存账户、额度及主动保存的配置等
- 不要将整个产品描述为占位页或等待名单。当前产品可体验，Pro 尚未开放购买。Dodo 是否接受此阶段提交，由其审核决定；如要求付费交付演示，应完成测试环境集成后补充。

参考：[Dodo 网站准备要求](https://docs.dodopayments.com/miscellaneous/verification-process)、[商家接纳政策](https://docs.dodopayments.com/miscellaneous/merchant-acceptance)。

## 收款开放是下一步

- [ ] Dodo KYC/KYB（以真实经营结构选择账户类型）、银行及产品审核。
- [ ] 创建与网站一致的 Pro 月付商品和税费展示。
- [ ] 服务端创建 Checkout，验证 Webhook 签名并幂等处理，关联已有用户。
- [ ] 付款、续费、取消、失败、退款事件同步账户权益；不得只根据跳转成功页开通。
- [ ] 可用的订阅管理和收据，完成测试购买与退款。
- [ ] 更新隐私及条款中的实际结账服务方，更新价格页/账户按钮与后端状态，再开放购买。

本次未开设 Dodo 账户、未部署公网、未购买服务。没有可用客服邮箱和真实 ABN 时，不应把当前版本当作已具备提交审核的完整资料。持有人姓名通常可从 ASIC 公共登记册查到，不在首页展示不代表身份匿名；官网展示要求与向 Dodo 提交的身份验证资料是两回事。

参考：[ASIC 商业名称展示要求](https://www.asic.gov.au/about-asic/contact-us/reporting-misconduct-to-asic/failure-to-display-a-business-name)、[ASIC 公共登记信息](https://www.asic.gov.au/bn-search)。

## 兼容约定

`resonance:*` 本机存储键、会话 Cookie、数据库/卷、内部事件及场景接口保留，以兼容现有用户数据。它们不是对外品牌。不要全局替换这些标识。
