---
title: 通过Termux在安卓上安装图形化Ubuntu界面
date: '2023-10-21'
description: 好玩.
tags:
  - Termux
  - Android
  - Ubuntu
category: 笔记
cover: notes
image: /assets/CxL8b7klborkDTxF6hPcPWJcn7b.png
---

# 通过Termux在安卓上安装图形化Ubuntu界面

## <b>1.准备工作</b>

需要的软件(都在安卓下):

[Termux](https://termux.dev/en/)

[AnLinux](https://github.com/EXALAB/AnLinux-App)

[Vnc Viewer](https://www.realvnc.com/en/connect/download/viewer/)

## <b>2.安装Ubuntu</b>

Termux 安装好 proot 后可以运行 Linux 系统，利用国光的Termux 一键安装 Linux 脚本安装 Ubuntu。

首先安装依赖：

```text
pkg install proot git python -y
```

下载脚本：

```text
git clone https://github.com/sqlsec/termux-install-linux
```

下载完成后进入目录：

```text
cd termux-install-linux
```

执行脚本：

```text
python termux-linux-install.py
```

出现以下界面：

<img src="/assets/CxL8b7klborkDTxF6hPcPWJcn7b.png" src-width="844" src-height="552" align="center"/>

输入 ```1``` 安装 <em>Ubuntu</em>

<b>---</b>

## <b>3.安装桌面</b>

安装完成后，依次执行下面的命令，进入 Ubuntu:

```text
cd ~/Termux-Linux/Ubuntu
```

```text
./start-ubuntu.sh
```

### <b>打开Anlinux</b>

点击左侧边栏

选择 <b>桌面</b> 或 <b>重量级桌面（不推荐重量级桌面，占用性能大且有BUG）</b>

<img src="/assets/S9mlb4KuHoXryrxH7oJc789HnMf.jpeg" src-width="1600" src-height="2560" align="center"/>

### <b>选择Ubuntu</b>

<img src="/assets/UNDlbGJ4CoaOg2xRa0xcIeMNnOf.jpeg" src-width="1280" src-height="2048" align="center"/>

### <b>选择你想安装的图形化界面（推荐Xfce4）</b>

<img src="/assets/HWQsbqo4zoVMCNx7s9acNDFjn4d.jpeg" src-width="1280" src-height="2048" align="center"/>

## <b>复制指令，回到Termux粘贴</b>

<img src="/assets/ItzPb4YHhoFrBOxX7wHc8ap6nGf.jpeg" src-width="1280" src-height="2048" align="center"/>

粘贴后会自动安装图形化界面

<b>---</b>

安装过程中会出现选择语言的界面，选择Chinese即可

最后会出现设置输入桌面系统密码，该密码用于连接VNC Viewer软件，按照提示会输入四次

<b>---</b>

## <b>3.启动VNCServer</b>

当出现下面的内容时，表明安装成功，VNCServer已启动

<img src="/assets/PUVPbQmuloSZQxx2aiIcytDznNc.png" src-width="1061" src-height="888" align="center"/>

### <b>但此时可能会出现黑屏BUG</b>

先输入命令停止当前server：

```text
vncserver -kill :*
```

安装vim以编辑文件

```text
apt install vim
```

打开启动文件

```text
vim ~/.vnc/xstartup
```

按 `i` 键进入编辑

删除其中所有内容，修改其中的内容如下：

```text
#!/bin/sh
 
export XKL_XMODMAP_DISABLE=1
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
 
xfce4-panel &
xfsettingsd &
xfwm4 &
xfdesktop &
pcmanfm &
xfce4-terminal &
```

按 `Esc` ，依次输入` : w q` 

此时退出文件编辑

最后输入：

```text
vncserver-start
```

启动VncServer后，生成的 `localhost:1` 是VNC Viewer软件连接Ubuntu桌面系统的地址：

<img src="/assets/UEVpbKe9Oo6N3dxlLK0cDImPnuf.png" src-width="789" src-height="1092" align="center"/>

## <b>4.打开Vnc Viewer</b>

按照软件提示一直点 Next，直到进入软件

在软件界面点击绿圈的+号

然后出现该界面

<img src="/assets/BPcPbSmVwog8vDxA3CCcJ8kgnkg.png" src-width="1070" src-height="1077" align="center"/>

输入 生成的 `localhost:1(输入自己所生成的)` 和 `名字(任意取)`

点击 `CREATE`

<b>---</b>

<img src="/assets/Qn7ybEzBIoZtXsxmH1ScGph5n6b.png" src-width="567" src-height="1094" align="center"/>

点击`CONNECT`

<b>---</b>

<img src="/assets/A7bubLyriopuGKxJ8wIcteEPnef.png" src-width="544" src-height="1092" align="center"/>

点击`OK`

<b>---</b>

### <b>接下来输入密码，点击记住密码，再点击右上角的继续</b>

### <b>耐心等待链接...</b>

<img src="/assets/YA8gbIFH3obfCGxjfYGc0GqQnUd.png" src-width="1333" src-height="836" align="center"/>

### <b>大功告成！</b>

<b>---</b>

## <b>5.退出与重新启动</b>

### <b>退出</b>

点击右上角的  叉号，即可退出VNC Viewer

但注意此时并未完全退出，需要在 Termux 的 linux 系统 （即root@localhost:~# 后 ）输入：

```text
vncserver-stop
```

才可以彻底的退出VNC Viewer

<b>再输入</b>

```text
exit
```

即可退出Ubuntu

<b>---</b>

### <b>再次进入</b>

依次执行下面的命令，进入 Ubuntu:

```text
cd ~/Termux-Linux/Ubuntu
```

```text
./start-ubuntu.sh
```

然后启动vncsever服务：

```text
vncserver-start
```

再次打开VNC Viewer 即可进入 Ubuntu 桌面化界面


