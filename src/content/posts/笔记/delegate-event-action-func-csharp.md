---
title: Delegate、event、action & func in C#
date: '2024-10-02'
description: 关于 C# 的委托相关的理解。
tags:
  - Csharp
category: 笔记
cover: notes
image: /assets/JabEbNjnEoLEpYxlTbscr8sCnpe.jpeg
---

# Delegate、event、action & func in C# 

### <b>delegate · 委托</b>

#### <b>什么是delegate</b>

`Delegate`是一个数据类型，我们可以像定义结构体一样定义一个`delegate类型`，`delegate`是存有对某个`方法(Function)` 的 `引用` 的一种引用类型变量。简单的说，它就是一个用来装函数的容器，有点像C++的函数指针但不太一样。

```csharp
public delegate void MyDelegate (int para);
```

上面就是一个输入参数为int，无返回值的委托的声明。

<img src="/assets/JabEbNjnEoLEpYxlTbscr8sCnpe.jpeg" src-width="4439" src-height="2340" align="center"/>

它可以这样用：

```csharp
class TestDelegate{
public delegate void MyDelegate (int para);

public void funcA(int a);
public void funcB(int b);

public void start(MyDelegate myDelegate)
{
    // 可以添加多个方法的引用
    myDelegate += funcA;
    myDelegate += funcB;
    // 可以去掉某些引用
    myDelegate -= funcB;

    // 可以这样赋值（注意：这样会清空myDelegate所有之前的引用）
    myDelegate = funcA;

    // 我们这样调用他
    myDelegate.Invoke(2); // 或者 myDelegate(2);
    // 这样调用后会向myDelegate所指向的所有函数传递参数2并按顺序逐个执行
    // 如果声明的委托类型是有返回值的类型，所执行的函数的返回值会被逐级覆盖，最后返回最后添加引用的函数的返回值
}
}
```

委托的基础使用就是这样了。我们会在什么情况下使用委托呢？

假设你是dice工作室的一名程序员，你们正在开发新的战地系列，现在你们想在每一局游戏结束后统计玩家的战绩，根据某些数据的排名来展示这一项最厉害的玩家。

现在我们有一个结构体用于存储每一局的每个玩家的数据：

```csharp
struct PlayerStats{
    string name;
    int kills;
    int deathtimes;
    int score;
}
```

在一局游戏结束后，我们按不同的类别展示玩家姓名，现在我们来写一个 displayPlayerName 类实现这个功能：

```csharp
class DisplayPlayerName{

    // 游戏结束时调用
    void onGameOver(PlayerStats[] allPlayerStats){
        string mostKillPlayer = bestPlayerByMostKill(allPlayerStats);
        string mostScorePlayer = bestPlayerByMostScore(allPlayerStats);
    };

    string bestPlayerByMostKill(PlayerStats[] allPlayerStats){
        string name = "";
        int bestkills = 0;
        foreach(PlayerStats stats in allplayerStats) {
            int kills = stats.kills;
            if (kills > bestkills){
                bestkills = kills;
                name = stats.name;
            }
        };
        return name;
    };

    string bestPlayerByMostScore(PlayerStats[] allPlayerStats){
        string name = "";
        int bestScore = 0;
        foreach(PlayerStats stats in allplayerStats) {
            int score = stats.score;
            if (score > bestScore){
                bestScore = score;
                name = stats.name;
            }
        };
        return name;
    };
}
```

可以看到，如果按照两项数据排名，我们就得写两个函数，而且这两个函数的大部分代码是相同的。可以预见如果我们有非常多的玩家数据，我们要写的函数方法数量将会非常多。

现在我们来试试引入委托。

首先我们先只保留一个返回玩家名的方法：

```csharp
class DisplayPlayerName{

    // 游戏结束时调用
    void onGameOver(PlayerStats[] allPlayerStats){
        string mostKillPlayer = bestPlayerByMost(allPlayerStats);
        string mostScorePlayer = bestPlayerByMost(allPlayerStats);
    };

    string bestPlayerByMost(PlayerStats[] allPlayerStats){
        string name = "";
        int bestkills = 0;
        foreach(PlayerStats stats in allplayerStats) {
            int kills = stats.kills;
            if (kills > bestkills){
                bestkills = kills;
                name = stats.name;
            }
        };
        return name;
    };
}
```

现在声明一个用于计算最高分的委托：

```csharp
class DisplayPlayerName{

    // 用来计算分数的委托
    delegate int scoreDelegate(PlayerStats stats);

    void onGameOver(PlayerStats[] allPlayerStats){
        string mostKillPlayer = bestPlayerByMost(allPlayerStats);
        string mostScorePlayer = bestPlayerByMost(allPlayerStats);
    };

    // 相应的，这里也要改一下
    string bestPlayerByMost(PlayerStats[] allPlayerStats,scoreDelegate scoreCaculator){
        string name = "";
        int bestScore = 0;
        foreach(PlayerStats stats in allplayerStats) {
            // 这里scoreDelegate返回值为int，并且传入了一个PlayerStats参数,与我们给委托的定义相匹配
            int score = scoreCaculator(stats);
            if (score > bestScore){
                bestScore = score;
                name = stats.name;
            }
        };
        return name;
    };
}
```

我们为计算分数的委托写一些小函数，现在就是更改后的样子：

```csharp
class DisplayPlayerName{

    delegate int scoreDelegate(PlayerStats stats);

    // 写两个函数用于不同情况的返回值
    int scoreByKills(PlayerStats stats)
    {
        return stats.kills;
    }
    int scoreByScore(PlayerStats stats)
    {
        return stats.score;
    }

    // 现在我们可以用一个函数完成计算
    void onGameOver(PlayerStats[] allPlayerStats){
        string mostKillPlayer = bestPlayerByMost(allPlayerStats,scoreByKills);
        string mostScorePlayer = bestPlayerByMost(allPlayerStats,scoreByScore);
    };


    string bestPlayerByMost(PlayerStats[] allPlayerStats,scoreDelegate scoreCaculator){
        string name = "";
        int bestScore = 0;
        foreach(PlayerStats stats in allplayerStats) {
            int score = scoreCaculator(stats);
            if (score > bestScore){
                bestScore = score;
                name = stats.name;
            }
        };
        return name;
    };
}
```

这看起来比之前要简洁多了！如果有更多项目，我们只需要写一些简单的小函数即可。

我们还可以使用`lambda`表达式进一步简化它：

```csharp
class DisplayPlayerName{

    delegate int scoreDelegate(PlayerStats stats);

    void onGameOver(PlayerStats[] allPlayerStats){
        // 像这样
        string mostKillPlayer = bestPlayerByMost(allPlayerStats, stats=>stats.kills);
        string mostScorePlayer = bestPlayerByMost(allPlayerStats, stats=>stats.score);
    };


    string bestPlayerByMost(PlayerStats[] allPlayerStats,scoreDelegate scoreCaculator){
        string name = "";
        int bestScore = 0;
        foreach(PlayerStats stats in allplayerStats) {
            int score = scoreCaculator(stats);
            if (score > bestScore){
                bestScore = score;
                name = stats.name;
            }
        };
        return name;
    };
}
```

这样就可以非常方便而且简洁的扩展它。

### <b>event · 事件</b>

写完了排名的代码，你突然闻到有一股烟味（谁又在工位上抽烟了？）你定睛一看：原来是工作室服务器着火了！幸运的是火很快被自动扑灭了，不幸的是有一块硬盘被烧坏了，所有玩家死亡后的逻辑代码全部消失了，你们不得不重新编写这部分代码。

你在回收站里发现了之前的某个时候的代码：

```csharp
class Player{
    Achievement achievement;
    UI ui;

    void die(){
        achievement.OnPlayerDeath();
        ui.OnPlayerDeath();
    };
}

class Achievement{
    public void OnPlayerDeath(){};
}

class UI{
    public void OnPlayerDeath(){};
}
```

这看起来还不错：一旦player挂掉，die函数就会调用所有需要知道player是否挂掉的类的处理函数。

但这样做有一些小问题：时刻追踪player什么时候挂掉的这点破事根本不应该是Player类该关心的（到了发工资的日子，难道应该是你自己来通知工作室发工资吗？），而且如果每一种行为（比如开枪、回血）都这么做，那很快player就会变得臃肿而丑陋。而且这样做还有一个最大的问题：如果与player有关的类有成千上万个，如果不破除Player类所关联的依赖的话，我们无法从项目中移除任何一个类——你需要找到所有调用了这个类的方法的地方并将他一一删掉，这样如果你想在另一个项目复用Player类几乎是不可能的。

这种情况我们就该请出委托了：

```csharp
class Player{
    delegate void deathDelegate();
    public deathDelegate deathevent;

    void die()
    {
        if(deathevent != null)
            deathevent();
    }
}

class Achievement{
    public Player player;
    void Start()
    {
        player.deathevent += OnPlayerDeath();
    }
    public void OnPlayerDeath(){

        // do something

        player.deathevent -= OnPlayerDeath();
    };
}

class UI{
     public Player player;
    void Start()
    {
        player.deathevent += OnPlayerDeath();
    }
    public void OnPlayerDeath(){

        // do something

        player.deathevent -= OnPlayerDeath();
    };
}
```

这样监听player是否死亡的职责就转移到了想要获取player是否死亡的类的身上，不管有多少类需要死亡状态，只需要在deathevent中注册一下即可，Player类本身也不需要关心谁调用了它。

这看起来很美好，但是还是有一些小问题。如果你加班太久头昏眼花，把他写成了这样：

```csharp
class Player{
    delegate void deathDelegate();
    public deathDelegate deathevent;

    void die()
    {
        if(deathevent != null)
            deathevent();
    }
}

class Achievement{
    public Player player;
    void Start()
    {
        player.deathevent = OnPlayerDeath();
    }
    public void OnPlayerDeath(){

        // do something

        player.deathevent -= OnPlayerDeath();
    };
}

class UI{
     public Player player;
    void Start()
    {
        player.deathevent += OnPlayerDeath();
    }
    public void OnPlayerDeath(){

        // do something

        player.deathevent -= OnPlayerDeath();
    };
}
```

看到了吗？

```csharp
......
class Achievement{
    public Player player;
    void Start()
    {
        // += 写成了 =
        player.deathevent = OnPlayerDeath();
    }
    ......
```

这样会清空所有注册了的函数，现在只有Achievement类注册了。

而且现在的deathevent可以在任何其他类中调用——即使player活得好好的。

为了解决这个问题，我们可以在委托的声明前面加上关键字`event`：

```csharp
class Player{
    delegate void deathDelegate();
    public event deathDelegate deathevent;

    void die()
    {
        if(deathevent != null)
            deathevent();
    }
}

class Achievement{
    public Player player;
    void Start()
    {
        player.deathevent += OnPlayerDeath();
    }
    public void OnPlayerDeath(){

        // do something

        player.deathevent -= OnPlayerDeath();
    };
}

class UI{
     public Player player;
    void Start()
    {
        player.deathevent += OnPlayerDeath();
    }
    public void OnPlayerDeath(){

        // do something

        player.deathevent -= OnPlayerDeath();
    };
}
```

这样一来，其他类只可以通过 `+=` 或 `-=` 调用 `deathevent`，这样就规避了上述风险。因此你可以把event理解成通过添加这个关键字就给委托添加了两个限制。

### <b>Action 和 Func</b>

Action 和 Func 并没有什么新功能，他们只是帮我们更便捷的创建委托和事件。

> 为了使用 Action 和 Func ，你需要 `using System;`

Action可以表示<b>无返回值</b>、无参数的的委托，我们可以把上面的委托声明简写成这样：

```csharp
class Player{
    // delegate void deathDelegate();
    // public event deathDelegate deathevent;
    public event Action deathevent;

    void die()
    {
        if(deathevent != null)
            deathevent();
    }
}
```

或者使用 ```Action&lt;T&gt;``` / ```Action&lt;T1,T2&gt;``` 表示<b>无返回值</b>、有参数的委托

它还有一个很方便的用法：

使用 Action 委托时，不必显式定义封装无参数过程的委托。 例如，以下代码显式声明名为 的 ShowValue 委托，并将对实例方法的 Name.DisplayToWindow 引用分配给其委托实例。

```csharp
using System;
using System.Windows.Forms;

public delegate void ShowValue();

public class Name
{
   private string instanceName;

   public Name(string name)
   {
      this.instanceName = name;
   }

   public void DisplayToConsole()
   {
      Console.WriteLine(this.instanceName);
   }

   public void DisplayToWindow()
   {
      MessageBox.Show(this.instanceName);
   }
}

public class testTestDelegate
{
   public static void Main()
   {
      Name testName = new Name("Koani");
      ShowValue showMethod = testName.DisplayToWindow;
      showMethod();
   }
}
```

通过Action 而不是显式定义新委托并为其分配命名方法。

```csharp
using System;
using System.Windows.Forms;

public class Name
{
   private string instanceName;

   public Name(string name)
   {
      this.instanceName = name;
   }

   public void DisplayToConsole()
   {
      Console.WriteLine(this.instanceName);
   }

   public void DisplayToWindow()
   {
      MessageBox.Show(this.instanceName);
   }
}

public class testTestDelegate
{
   public static void Main()
   {
      Name testName = new Name("Koani");
      Action showMethod = testName.DisplayToWindow;
      showMethod();
   }
}
```

很方便，可以少一行。

相对应的，```Func&lt;...&gt;``` 表示<b>有返回值</b>的委托，```&lt;&gt;``` 中前面的参数会作为委托的参数使用，而最后一个参数作为返回值:

```text
Func<T> ->  delegate T myDelegate();
```

```text
Func<T1,T2,T3> ->  delegate T3 myDelegate(T1 t1,T2 t2);
```


