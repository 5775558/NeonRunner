# NeonRunner

原创手机三车道跑酷游戏

## 安卓 APK 构建说明

本项目已包装为 Android 应用，可通过 GitHub Actions 自动生成 APK。

### 如何在 GitHub Actions 中下载 APK

1. 打开仓库页面的 **[Actions](https://github.com/5775558/NeonRunner/actions)** 标签页
2. 选择最新的 workflow 运行（`Build Android APK`）
3. 点击任务名 **"Build Debug APK"**
4. 在页面下方找到 **"Artifacts"** 区域
5. 点击下载 `app-debug-apk.zip` 文件
6. 解压后即可获得 `app-debug.apk` 文件

### APK 安装

将 APK 文件传输到安卓设备，安装即可运行。

### 项目结构

- `index.html` - 原始网页游戏（保持不变）
- `app/` - Android Gradle 项目目录
  - `app/src/main/assets/www/index.html` - 打包进 APK 的游戏文件
  - `app/src/main/java/com/neonrunner/game/MainActivity.java` - Android Activity
  - `app/src/main/AndroidManifest.xml` - Android 清单文件
  - `app/src/main/res/layout/activity_main.xml` - 界面布局
  - `app/src/main/res/values/strings.xml` - 字符串资源
  - `app/src/main/res/values/styles.xml` - 样式资源
- `.github/workflows/android-apk.yml` - GitHub Actions 构建配置
- `settings.gradle` - Gradle 项目设置
- `build.gradle` - 根构建脚本
- `app/build.gradle` - 应用构建脚本

### 本地构建

需要 Android Studio 或命令行 Gradle：

```bash
./gradlew assembleDebug
```

生成的 APK 位于：`app/build/outputs/apk/debug/app-debug.apk`
