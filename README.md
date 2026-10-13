# mir-camping-admin-pages

独立 Pages 版本，不覆盖 Workers 项目。页面及业务接口保留，附件上传继续暂停。

## Git 与 Cloudflare
- 本文件夹内源文件上传到独立私有仓库，不上传构建目录、密码或客户数据。
- 创建 Pages 项目连接仓库，生产分支 main。
- 项目名称建议 mir-camping-admin-pages；如被占用，另选名称并同步 wrangler.json 的 name。
- 框架 None；构建命令 npm run build；输出目录 pages-dist；根目录留空。
- Node 24（.nvmrc）；构建变量可设置 NODE_VERSION=24。
- 构建使用 worker-build.json，上线使用 wrangler.json；不要将 dist/client 当成输出目录，否则会丢失接口。
- DB 已绑定现有数据库，不要重新建表或导入初始化 SQL。
- 关闭非生产分支预览自动部署，避免测试写入正式 DB。
- PUBLIC_SITE_URL 改成新官网实际 Pages 地址，不能填旧 workers.dev 地址。
- 在 Production 机密设置 ADMIN_PASSWORD_HASH；旧项目的密码机密不会自动迁移，不要写入Git。
- 密码未配置时后台拒绝登录。

## 本地测试
npm ci，npm run build，npm run dev。默认连接本地模拟数据库，不访问线上数据，本地需要初始化测试表。不要把真实密码写入源码。

## 上线验证
保留原站，测试中俄文、产品详情、采购清单、文字留言、后台登录、查询、状态修改、CSV 导出、退出登录。使用国内手机移动网络和俄罗斯网络关闭VPN实测。Pages不保证所有运营商持续可达。

https://developers.cloudflare.com/pages/functions/advanced-mode/
