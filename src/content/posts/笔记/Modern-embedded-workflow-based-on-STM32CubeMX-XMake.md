---
title: 基于STM32CubeMX & XMake的现代化嵌入式工作流
date: '2024-12-15'
description: 写起来比较拟人的工作流.
tags:
  - 嵌入式
category: 笔记
cover: notes
image: /assets/SVUDbJ5aZoM38rxnYQgcnFTBnnd.png
---

# 基于STM32CubeMX & XMake的现代化嵌入式工作流

# <b>基于STM32CubeMX & XMake的现代化嵌入式工作流</b>

### <b>项目目录</b>

项目的目录一般来说会像这样：

```text
-----根目录
    |---bsp （存放CubeMX生成的文件，包括STM32的各种配置）
        |---HAL 
            |--- ...
            |--- ...
            |--- makefile （确保makefile在此目录下）
    |---app （用户代码目录，存放你自己写的逻辑代码）
        |---app.cpp
        |---app.hpp
    |---build （XMake编译后产生的构建文件夹）
        |--- ...
    |---script
        |--- read_hal_makefile.lua （读取makefile的脚本）
    |---xmake.lua （XMake编译选项文件）
```

这里有一个模板仓库:

[modern-embedded-workflow](http://github.com/lisiiii/modern-embedded-workflow)

我们的工作流程是:

使用STM32CubeMX生成代码、配置开发板 -&gt; 写C++/C代码逻辑 -&gt; XMake读取STM32CubeMX生成的makefile，调用gnu-arm工具链编译我们的代码 -&gt; 使用OZone或JLink相关工具烧录

<b>---</b>

# <b>实现的效果</b>

### <b>图形化的、简单的引脚配置——以点灯为例</b>

> 设置LED对应的引脚为GPIO_output，并给他一个别名（CubeMX会帮你做好所有的初始化工作，你一行代码都不需要写）

<img src="/assets/SVUDbJ5aZoM38rxnYQgcnFTBnnd.png" src-width="2858" src-height="1609" align="center"/>

> 与繁杂的HAL库分离开来，你可以简单地写C/C++代码

<img src="/assets/XmgPbaW7woubvvxtlurcpVonnUe.png" src-width="3840" src-height="2100" align="center"/>

> 一键烧录

<img src="" src-width="2454" src-height="972" align="center"/>

<b>---</b>

# <b>准备工作</b>

### <b>下载CubeMX IDE</b>

我们需要STM32CubeMX作为我们的代码生成器，帮助我们生成各种繁琐的配置代码。

[点击跳转: STM32CubeMX官网](https://www.st.com.cn/zh/development-tools/stm32cubemx.html)

<img src="/assets/NwwCbPZpWojDENxGG46czHWNntc.png" src-width="3840" src-height="2100" align="center"/>

推荐6.12.0版本

### <b>下载VSCode作为我们的代码编辑器</b>

[点击跳转: VSCode官网](https://code.visualstudio.com/)

### <b>下载安装XMake作为我们的构建工具</b>

[下载链接(windows)](https://github.com/xmake-io/xmake/releases/download/v2.9.6/xmake-v2.9.6.win64.exe)

或者你也可以根据你的系统自选下载：

[XMake-github](https://github.com/xmake-io/xmake/releases/tag/v2.9.6)

### <b>安装gnu-arm工具链</b>

在vscode的插件商店搜索`EIDE`，然后安装

<img src="/assets/MuwTbuGpxoQE8qxETznccYDknsp.png" src-width="2136" src-height="1575" align="center"/>

完成后，找到左边的EIDE图标，按图指示安装这两个工具

<img src="/assets/GqKqbyxo6oPdXKx4ISyc8tC4nEc.png" src-width="3840" src-height="2100" align="center"/>

# <b>开始开发</b>

### <b>STM32CubeMX的配置</b>

> - 注意：遇到让你下载的弹框一定要选择下载

打开我们的STM32CubeMX，选择MCU型号

<img src="/assets/AcELbcHwroE3dlxdYlVcQwYgnWb.png" src-width="2858" src-height="1609" align="center"/>

我们使用F103C8T6

<img src="/assets/DnDybcUBuosdXHxaExQcHzEnnRh.png" src-width="2078" src-height="1375" align="center"/>

配置Debug模式方便烧录和调试

<img src="/assets/KojlbIiTjo2evbxB5KHc7IL4nzz.png" src-width="2858" src-height="1609" align="center"/>

配置外部时钟以方便我们使用更高频率

<img src="/assets/QYOqbeRnKojvQ0xAO2ZcN9conpe.png" src-width="2858" src-height="1609" align="center"/>

Clock Configuration里就可以改成72MHZ了（遇到弹框OK即可）

<img src="/assets/DPrXbfXrWonFROxsBrmcqexFnMf.png" src-width="2858" src-height="1609" align="center"/>

ProjectManager里面我们设置成生成Makefile，项目名自定，路径随便（我们待会还要改）

<img src="/assets/HVBZbtY9JoFOQJxMXqAcFZxnnee.png" src-width="2858" src-height="1609" align="center"/>

<img src="/assets/JWLvbt9HDoPhNoxxuxqciOZenFg.png" src-width="2858" src-height="1609" align="center"/>

先点个LED吧！

我的芯片LED引脚是PB2,这里我选择PB2将其改成GPIO_Output模式

<img src="/assets/ZGdGbXpOvooHNDxdsBUcbLmxn1g.png" src-width="2858" src-height="1609" align="center"/>

右键它给他起个名字（这样在代码里也可以使用）

<img src="/assets/E535b67DjoB0lWxF7jscmKA1nCh.png" src-width="2858" src-height="1609" align="center"/>

先生成代码

<img src="/assets/Amg3bJEoQodciExP7irckjZSnPe.png" src-width="2858" src-height="1609" align="center"/>

找到生成代码的文件夹，我们需要复制.ioc这个文件，其余的都删除

<img src="/assets/LYZnb9UmYoQiHnxnqOwcBEKdnLc.png" src-width="1541" src-height="823" align="center"/>

将其复制到 `你的项目目录/bsp/HAL/` 下，然后双击打开

<img src="/assets/Xj3tbnnH1oVcF7xbAPrc6hJJnCc.png" src-width="1541" src-height="823" align="center"/>

这回再生成代码，路径就是对的了

<img src="/assets/JkVFbztAgobBTExoCFBcVpS7nOh.png" src-width="2858" src-height="1609" align="center"/>

<img src="/assets/OxJTb9vK7oF11jx7ZIGcADrtnGd.png" src-width="1541" src-height="823" align="center"/>

### <b>XMake的配置</b>

VSCode进入xmake.lua所在目录(即项目根目录)，输入

`xmake f --sdk="你的gnu-arm工具链目录"` 

一般eide安装的默认在“用户”文件夹下的.eide文件夹里，就像这样：

<img src="/assets/DH54bKTpbohCaVxg6w5cKQmSnrf.png" src-width="1727" src-height="87" align="center"/>

这样证明已经配置成功，我们可以开始写代码了！

### <b>写代码</b>

我们在 app 文件夹下存放我们的代码逻辑

- app.hpp (这样写可以让我们在只支持C语言的开发板上写C++)
    ```cpp
#pragma once 

#ifdef __cplusplus
extern "C" {
#endif
void entrypoint();
#ifdef __cplusplus
}
#endif
```

- app.cpp
    ```cpp
#include <main.h> //这里包含上我们STM32CubeMX生成的main.c主函数
#include "app/app.hpp"

void entrypoint() {
    // 这里写主逻辑
    while (true) {
        HAL_GPIO_TogglePin(LED_GPIO_Port, LED_Pin);
        HAL_Delay(200);
    }
}
```

回到 `main.c` 文件 （`项目目录\bsp\HAL\Core\Src\main.c`）

把我们写的entrypoint函数放进去（注意添加在所有初始化函数完成之后）

<img src="/assets/FVhibp35fo8tYHxNu39cSXYQnkh.png" src-width="1368" src-height="1388" align="center"/>

包含进我们的 `app.hpp`

<img src="/assets/VJ0ib5rJfoFmYRx4PjOcJArUnae.png" src-width="1424" src-height="1383" align="center"/>

最后在根目录执行 `xmake`

<img src="/assets/AveTbwqPyonpUgxa2pxcsG9VnTh.png" src-width="1602" src-height="938" align="center"/>

大功告成！

<img src="/assets/HedcbBDQ6oFacMx8OuycD980nNg.png" src-width="356" src-height="502" align="center"/>

build下就生成了可以烧录的elf文件

### <b>如果用OZone烧录</b>

<img src="/assets/Hh3ob9FZVoJs0Ix0oa7c12WDnWd.png" src-width="2528" src-height="1550" align="center"/>

<img src="/assets/HdHrbUCBUoDzyHx6B4vckZoonNf.png" src-width="2528" src-height="1550" align="center"/>

<img src="/assets/KikvbXSbxo9nKYxJQRWc8JCQnfd.png" src-width="2528" src-height="1550" align="center"/>

这样配置后最终按下这个小按钮就可以烧录了

<img src="/assets/MlUfbIc0sodo6NxUE2cc970fnKc.png" src-width="2272" src-height="1606" align="center"/>


