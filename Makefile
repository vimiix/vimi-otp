.PHONY: build clean zip help

# 版本号从 manifest.json 读取
VERSION := $(shell grep '"version"' manifest.json | sed 's/.*: *"\([^"]*\)".*/\1/')
DIST_DIR := dist
ZIP_NAME := vimiotp-$(VERSION).zip

help:
	@echo "VimiOTP 构建工具"
	@echo ""
	@echo "使用方法:"
	@echo "  make build   - 构建发布包 (zip)"
	@echo "  make clean   - 清理构建产物"
	@echo "  make zip     - 同 build"
	@echo "  make help    - 显示帮助信息"
	@echo ""
	@echo "当前版本: $(VERSION)"

build: clean zip

zip:
	@echo "正在打包 VimiOTP v$(VERSION)..."
	@mkdir -p $(DIST_DIR)
	@zip -r $(DIST_DIR)/$(ZIP_NAME) \
		manifest.json \
		popup.html \
		popup.css \
		popup.js \
		icons/ \
		lib/ \
		-x "*.DS_Store" \
		-x "*/.git/*"
	@echo "打包完成: $(DIST_DIR)/$(ZIP_NAME)"
	@echo ""
	@echo "上架 Chrome 商店步骤:"
	@echo "1. 访问 https://chrome.google.com/webstore/devconsole"
	@echo "2. 登录 Google 开发者账号"
	@echo "3. 点击「新建项目」或选择已有项目"
	@echo "4. 上传 $(DIST_DIR)/$(ZIP_NAME)"
	@echo "5. 填写商店信息并提交审核"

clean:
	@echo "清理构建产物..."
	@rm -rf $(DIST_DIR)
	@echo "清理完成"
