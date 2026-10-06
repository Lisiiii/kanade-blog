---
title: HAL库的编码器模式/通用定时器中两个重要参数的设置
date: '2023-10-21'
description: 得记下来.
tags:
  - 嵌入式
  - Hal库
category: 笔记
cover: notes
---

# HAL库的编码器模式/通用定时器中两个重要参数的设置

## <b>通用定时器中两个重要参数的设置（TIM_Prescaler、TIM_Period）</b>

TIM_Prescaler：定时器预分频器设置，时钟源经该预分频器才是定时器时钟，它设定 TIMx_PSC寄存器的值。可设置范围为 0 至 65535，实现 1 至 65536 分频。

TIM_Period：定时器周期，实际就是设定自动重载寄存器的值，在事件生成时更新到影子寄存器。可设置范围为 0 至 65535。

根据定时器时钟的频率，比如时钟的频率是72MHZ，可以理解为一秒钟STM32会自己数72M次，预分频系数就是将频率分割，比如分频系数是72，则该时钟的频率会变成72MHZ/72=1MHZ，但是在设置的时候要注意，数值应该是72-1。假定分频系数是72-1，那么频率变成1MHZ，也就意味着STM32在一秒钟会数1M次，即1us数一次。好了，接下来就是确定预装载值，比如需要定时1ms，由于1ms=1us*1000,那么预装载值就是1000-1；如此类推，在预分频系数确定的情况下，定时的时长就由预装载值确定了。至于要把值减一的原因，计数是从0开始，所以要减一。

## <b>HAL库的编码器模式</b>

STM32的定时器TIM1，2，3，5，8中有专门的编码器模式，省去了我们读脉冲和计数的操作。而且配置全面

可以配置：

计数方式（counter mode）：即向上计数还是向下计数，不过使用编码器都是记录转的角度，读取计数器从0开始的计数，所以一般来说都是向上计数

编码器模式（encoder mode）：Tl1是只检测上升沿，Tl2只检测下降沿。Tl1 and Tl2是上下沿都检测，那么脉冲数将是只检测一个沿的两倍。

检测极性（Polarity）：触发捕获AB相的极性。意思是比如设为Rising Edge，那么检测到上升沿的时候就触发encoder捕获AB相的值

### <b>具体配置</b>

将所选TIM中的“Combined Channels”设为Encoder Mode

可以看到Channel1和Channel2已经灰了，表示这两个通道已经被使用为编码器模式了

这时候要在右侧的管脚图看看自动配置的是哪两个脚，和硬件原理图比对一下，若是不一样要改成原理图上的引脚

参数配置：主要参数含义已经在上面提过了

有一点就是，重载值，即计数器数到多少就清零，设为最大就行。16bit的就设为0xffff，32bit就设为0xffffffff。设的太小会用着用着跳零，编码器就失效了

若是带Z相的编码器，就把它配置成GPIO-INPUT模式，若是编码器经0输出高电平，则下拉；反之，上拉

encoder模式的编程很简单，内容很少，HAL库定义的所有函数在stm32f4xx_hal_tim.c文件的2558到3143行。包括了：

初始化类函数

```text
//编码器初始化
HAL_StatusTypeDef HAL_TIM_Encoder_Init(TIM_HandleTypeDef *htim,  TIM_Encoder_InitTypeDef *sConfig)
//编码器解初始化
HAL_StatusTypeDef HAL_TIM_Encoder_DeInit(TIM_HandleTypeDef *htim)

__weak void HAL_TIM_Encoder_MspInit(TIM_HandleTypeDef *htim)

__weak void HAL_TIM_Encoder_MspDeInit(TIM_HandleTypeDef *htim)
```

起止类函数：

```text
//开启编码器
HAL_StatusTypeDef HAL_TIM_Encoder_Start(TIM_HandleTypeDef *htim, uint32_t Channel)
//关闭编码器
HAL_StatusTypeDef HAL_TIM_Encoder_Stop(TIM_HandleTypeDef *htim, uint32_t Channel)
```

中断类函数：

```text
//开启成功中断
HAL_StatusTypeDef HAL_TIM_Encoder_Start_IT(TIM_HandleTypeDef *htim, uint32_t Channel)
//关闭成功中断
HAL_StatusTypeDef HAL_TIM_Encoder_Stop_IT(TIM_HandleTypeDef *htim, uint32_t Channel)
```

DMA类函数：

```text
//开启DMA
HAL_StatusTypeDef HAL_TIM_Encoder_Start_DMA(TIM_HandleTypeDef *htim, uint32_t Channel, uint32_t *pData1,uint32_t *pData2, uint16_t Length)
//关闭DMA
HAL_StatusTypeDef HAL_TIM_Encoder_Stop_DMA(TIM_HandleTypeDef *htim, uint32_t Channel)
```

基本操作

开启encoder：

```text
HAL_TIM_Encoder_Start(&htimx, TIM_CHANNEL_ALL);
```

读取编码器数据：

```text
int GetData;//编码器数值
GetData = __HAL_TIM_GET_COUNTER(&htim3);//0位正，1为负
```

获取编码器方向：

```text
int Direction;//编码器方向
Direction = __HAL_TIM_IS_TIM_COUNTING_DOWN(&htim3);     // 是否向下计数
```


