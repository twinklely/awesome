---
title: Java 的 volatile 关键字和内存可见性
tags:
  - Java
  - 内存管理
status: robot
class: Java
slug: java-volatile-keyword-memory-visibility
ref:
---

### 要点提炼
[](#要点提炼)
- **核心作用**：保证内存可见性和禁止指令重排序
- **实现机制**：底层通过内存屏障实现，强制刷新CPU缓存
- **局限性**：不保证原子性，适用于状态标志和双重检查锁定
- **性能特点**：与synchronized区别：轻量级，无锁机制

### 详细解答
[](#详细解答)
#### 1. volatile基本概念
[](#1-volatile基本概念)
##### 1.1 什么是volatile
[](#11-什么是volatile)
```
public class VolatileExample {
    // 普通变量：可能不可见
    private boolean flag = false;

    // volatile变量：保证可见性
    private volatile boolean volatileFlag = false;

    // volatile对象引用
    private volatile Object obj = new Object();

    // volatile数组引用（注意：数组元素不是volatile的）
    private volatile int[] array = new int[10];
}
```

**volatile的两个核心特性：**

1. **内存可见性**：一个线程对volatile变量的修改对其他线程立即可见
2. **禁止指令重排序**：防止编译器和处理器对volatile变量相关操作进行重排序

##### 1.2 内存可见性问题
[](#12-内存可见性问题)
```
public class VisibilityProblem {
    private boolean running = true;  // 普通变量

    public void testVisibility() {
        // 线程1：读取线程
        new Thread(() -> {
            int count = 0;
            while (running) {  // 可能永远无法读取到false
                count++;
            }
            System.out.println("线程1结束，count = " + count);
        }).start();

        // 线程2：修改线程
        new Thread(() -> {
            try {
                Thread.sleep(1000);
                running = false;  // 修改可能对线程1不可见
                System.out.println("线程2设置running = false");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }
}

// 解决方案：使用volatile
public class VisibilitySolution {
    private volatile boolean running = true;  // 使用volatile

    public void testVisibility() {
        // 现在线程1能够及时看到running的变化
        new Thread(() -> {
            int count = 0;
            while (running) {
                count++;
            }
            System.out.println("线程1结束，count = " + count);
        }).start();

        new Thread(() -> {
            try {
                Thread.sleep(1000);
                running = false;  // 修改对线程1立即可见
                System.out.println("线程2设置running = false");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }
}
```

#### 2. Java内存模型（JMM）
[](#2-java内存模型jmm)
##### 2.1 JMM基本结构
[](#21-jmm基本结构)
```
/*
JMM内存模型：

主内存 (Main Memory)
    ↓          ↑
工作内存1    工作内存2    工作内存N
(Thread 1)  (Thread 2)  (Thread N)

每个线程都有自己的工作内存（CPU缓存），
变量在主内存和工作内存之间进行交互
*/

public class JMMExample {
    private int value = 0;           // 存储在主内存
    private volatile int volatileValue = 0;  // volatile变量

    // 线程1的操作
    public void thread1Operation() {
        // 1. 从主内存读取value到工作内存
        // 2. 在工作内存中修改
        // 3. 写回主内存（时机不确定）
        value = 1;

        // volatile变量的操作
        // 立即写回主内存，并使其他线程的缓存失效
        volatileValue = 1;
    }

    // 线程2的操作
    public void thread2Operation() {
        // 可能读取到旧值
        int localValue = value;

        // 总是读取到最新值
        int localVolatileValue = volatileValue;
    }
}
```

##### 2.2 内存交互操作
[](#22-内存交互操作)
```
public class MemoryOperations {
    /*
    JMM定义的8种内存交互操作：

    主内存操作：
    - read：从主内存读取变量值
    - write：向主内存写入变量值

    工作内存操作：
    - load：将read的值加载到工作内存变量副本
    - store：将工作内存变量副本存储，准备write到主内存
    - use：将工作内存变量值传递给执行引擎
    - assign：将执行引擎接收的值赋给工作内存变量
    - lock：锁定主内存变量
    - unlock：解锁主内存变量
    */

    private volatile int volatileVar = 0;
    private int normalVar = 0;

    public void demonstrateOperations() {
        // 普通变量的读操作：read -> load -> use
        int temp1 = normalVar;

        // 普通变量的写操作：assign -> store -> write
        normalVar = 10;

        // volatile变量的读操作：强制从主内存读取
        int temp2 = volatileVar;  // 立即执行 read -> load -> use

        // volatile变量的写操作：强制写入主内存
        volatileVar = 20;  // 立即执行 assign -> store -> write
    }
}
```

#### 3. volatile实现原理
[](#3-volatile实现原理)
##### 3.1 内存屏障
[](#31-内存屏障)
```
public class MemoryBarrierExample {
    private volatile boolean flag = false;
    private int data = 0;

    /*
    volatile的内存屏障插入策略：

    1. 在每个volatile写操作前插入StoreStore屏障
    2. 在每个volatile写操作后插入StoreLoad屏障
    3. 在每个volatile读操作后插入LoadLoad屏障
    4. 在每个volatile读操作后插入LoadStore屏障
    */

    public void writer() {
        data = 42;           // 普通写
        // StoreStore屏障：确保data的写入在flag写入之前完成
        flag = true;         // volatile写
        // StoreLoad屏障：确保flag的写入对后续读操作可见
    }

    public void reader() {
        if (flag) {          // volatile读
            // LoadLoad屏障：确保flag的读取在data读取之前完成
            // LoadStore屏障：确保flag的读取在后续写操作之前完成
            int localData = data;  // 普通读，一定能读到42
            System.out.println("data = " + localData);
        }
    }
}
```

##### 3.2 汇编层面实现
[](#32-汇编层面实现)
```
public class AssemblyLevelExample {
    private volatile int volatileValue = 0;

    public void setVolatileValue(int value) {
        this.volatileValue = value;
        // 在x86架构上，volatile写操作会生成类似这样的汇编：
        // mov %eax, 0x150(%rsi)    ; 将值写入内存
        // lock addl $0, (%rsp)     ; lock前缀，强制缓存一致性
    }

    public int getVolatileValue() {
        return this.volatileValue;
        // volatile读操作确保从主内存读取最新值
    }
}
```

#### 4. volatile的使用场景
[](#4-volatile的使用场景)
##### 4.1 状态标志
[](#41-状态标志)
```
public class StatusFlag {
    private volatile boolean shutdown = false;

    // 主线程
    public void mainThread() {
        while (!shutdown) {
            // 执行任务
            doWork();
        }
        cleanup();
    }

    // 控制线程
    public void controlThread() {
        // 关闭信号
        shutdown = true;  // 对主线程立即可见
    }

    private void doWork() {
        // 模拟工作
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void cleanup() {
        System.out.println("清理资源");
    }
}
```

##### 4.2 双重检查锁定（DCL）
[](#42-双重检查锁定dcl)
```
public class Singleton {
    // 使用volatile确保实例化的可见性和禁止重排序
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {  // 第一次检查，无锁
            synchronized (Singleton.class) {
                if (instance == null) {  // 第二次检查，有锁
                    // 没有volatile可能出现问题：
                    // 1. 分配内存空间
                    // 2. 初始化对象
                    // 3. 将instance指向内存空间
                    // 2和3可能被重排序，导致返回未初始化的对象
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}

// 错误示例：没有volatile的问题
public class BrokenSingleton {
    private static BrokenSingleton instance;  // 没有volatile

    public static BrokenSingleton getInstance() {
        if (instance == null) {
            synchronized (BrokenSingleton.class) {
                if (instance == null) {
                    // 可能的执行顺序：
                    // 1. 分配内存
                    // 3. instance指向内存（重排序）
                    // 2. 初始化对象
                    // 此时其他线程可能读取到未初始化的对象
                    instance = new BrokenSingleton();
                }
            }
        }
        return instance;
    }
}
```

##### 4.3 发布对象
[](#43-发布对象)
```
public class SafePublication {
    private volatile SomeObject object;  // 使用volatile发布对象

    // 发布线程
    public void publish() {
        SomeObject temp = new SomeObject();
        temp.initialize();  // 初始化对象
        object = temp;      // volatile写，确保初始化对其他线程可见
    }

    // 消费线程
    public void consume() {
        SomeObject localRef = object;  // volatile读
        if (localRef != null) {
            // 能够安全访问已初始化的对象
            localRef.use();
        }
    }

    private static class SomeObject {
        private int value;

        public void initialize() {
            value = 42;
        }

        public void use() {
            System.out.println("value = " + value);
        }
    }
}
```

#### 5. volatile的局限性
[](#5-volatile的局限性)
##### 5.1 不保证原子性
[](#51-不保证原子性)
```
public class AtomicityProblem {
    private volatile int count = 0;

    // 错误：volatile不能保证复合操作的原子性
    public void increment() {
        count++;  // 这不是原子操作！
        // 实际上包含三个步骤：
        // 1. 读取count的值
        // 2. 将值加1
        // 3. 将结果写回count
        // 在多线程环境下可能出现竞态条件
    }

    // 正确做法1：使用synchronized
    public synchronized void safeIncrement1() {
        count++;
    }

    // 正确做法2：使用AtomicInteger
    private final AtomicInteger atomicCount = new AtomicInteger(0);

    public void safeIncrement2() {
        atomicCount.incrementAndGet();  // 原子操作
    }

    // 演示竞态条件
    public void demonstrateRaceCondition() throws InterruptedException {
        int threadCount = 10;
        int incrementsPerThread = 1000;

        Thread[] threads = new Thread[threadCount];
        for (int i = 0; i < threadCount; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < incrementsPerThread; j++) {
                    increment();  // 不安全的递增
                }
            });
        }

        for (Thread thread : threads) {
            thread.start();
        }

        for (Thread thread : threads) {
            thread.join();
        }

        // 期望值：10000，实际值可能小于10000
        System.out.println("期望值: " + (threadCount * incrementsPerThread));
        System.out.println("实际值: " + count);
    }
}
```

##### 5.2 volatile与原子类的对比
[](#52-volatile与原子类的对比)
```
public class VolatileVsAtomic {
    private volatile int volatileCounter = 0;
    private AtomicInteger atomicCounter = new AtomicInteger(0);

    // volatile版本：不线程安全
    public void volatileIncrement() {
        volatileCounter++;  // 复合操作，不原子
    }

    // atomic版本：线程安全
    public void atomicIncrement() {
        atomicCounter.incrementAndGet();  // 原子操作
    }

    // volatile适用场景：单纯的赋值操作
    public void volatileAssignment(int value) {
        volatileCounter = value;  // 简单赋值，线程安全
    }

    // volatile读取操作
    public int volatileRead() {
        return volatileCounter;  // 读取操作，能获取最新值
    }

    // 性能对比测试
    public void performanceComparison() {
        long iterations = 10_000_000;

        // 测试volatile写入
        long start = System.nanoTime();
        for (long i = 0; i < iterations; i++) {
            volatileCounter = (int) i;
        }
        long volatileTime = System.nanoTime() - start;

        // 测试atomic写入
        start = System.nanoTime();
        for (long i = 0; i < iterations; i++) {
            atomicCounter.set((int) i);
        }
        long atomicTime = System.nanoTime() - start;

        System.out.println("Volatile赋值时间: " + volatileTime + "ns");
        System.out.println("Atomic赋值时间: " + atomicTime + "ns");
    }
}
```

#### 6. volatile与synchronized对比
[](#6-volatile与synchronized对比)
##### 6.1 功能对比
[](#61-功能对比)
```
public class VolatileVsSynchronized {
    private volatile boolean volatileFlag = false;
    private boolean syncFlag = false;
    private int count = 0;

    // volatile方式：轻量级，只保证可见性
    public void setVolatileFlag(boolean flag) {
        volatileFlag = flag;  // 原子操作，立即可见
    }

    public boolean getVolatileFlag() {
        return volatileFlag;  // 读取最新值
    }

    // synchronized方式：重量级，保证原子性和可见性
    public synchronized void setSyncFlag(boolean flag) {
        syncFlag = flag;      // 在同步块中，保证原子性和可见性
        count++;             // 复合操作也是安全的
    }

    public synchronized boolean getSyncFlag() {
        return syncFlag;      // 在同步块中读取
    }

    // 对比表格
    /*
    特性                volatile        synchronized
    内存可见性           ✓              ✓
    原子性              ✗              ✓
    阻塞性              ✗              ✓
    重排序防护           有限            完全
    性能开销             低             高
    适用场景            状态标志        复合操作
    */
}
```

##### 6.2 性能对比
[](#62-性能对比)
```
public class PerformanceComparison {
    private volatile int volatileValue = 0;
    private int synchronizedValue = 0;
    private final Object lock = new Object();

    // volatile读写
    public void volatileReadWrite() {
        volatileValue = 42;       // 快速写入
        int temp = volatileValue; // 快速读取
    }

    // synchronized读写
    public void synchronizedReadWrite() {
        synchronized (lock) {
            synchronizedValue = 42;       // 需要获取锁
            int temp = synchronizedValue; // 需要获取锁
        }
    }

    // 性能测试
    public void performanceTest() throws InterruptedException {
        int iterations = 1_000_000;
        int threadCount = 4;

        // 测试volatile性能
        long start = System.nanoTime();
        Thread[] volatileThreads = new Thread[threadCount];
        for (int i = 0; i < threadCount; i++) {
            volatileThreads[i] = new Thread(() -> {
                for (int j = 0; j < iterations; j++) {
                    volatileReadWrite();
                }
            });
            volatileThreads[i].start();
        }

        for (Thread thread : volatileThreads) {
            thread.join();
        }
        long volatileTime = System.nanoTime() - start;

        // 测试synchronized性能
        start = System.nanoTime();
        Thread[] syncThreads = new Thread[threadCount];
        for (int i = 0; i < threadCount; i++) {
            syncThreads[i] = new Thread(() -> {
                for (int j = 0; j < iterations; j++) {
                    synchronizedReadWrite();
                }
            });
            syncThreads[i].start();
        }

        for (Thread thread : syncThreads) {
            thread.join();
        }
        long syncTime = System.nanoTime() - start;

        System.out.println("Volatile时间: " + volatileTime + "ns");
        System.out.println("Synchronized时间: " + syncTime + "ns");
        System.out.println("性能差异: " + (syncTime / volatileTime) + "倍");
    }
}
```

#### 7. 最佳实践
[](#7-最佳实践)
##### 7.1 何时使用volatile
[](#71-何时使用volatile)
```
public class VolatileBestPractices {

    // ✓ 适用场景1：状态标志
    private volatile boolean cancelled = false;

    public void cancel() {
        cancelled = true;
    }

    public void doWork() {
        while (!cancelled) {
            // 执行工作
        }
    }

    // ✓ 适用场景2：配置变量
    private volatile int maxConnections = 100;

    public void updateConfig(int newMax) {
        maxConnections = newMax;  // 立即对所有线程可见
    }

    // ✓ 适用场景3：发布不可变对象
    private volatile ImmutableConfig config;

    public void updateConfig(ImmutableConfig newConfig) {
        config = newConfig;  // 安全发布不可变对象
    }

    // ✗ 不适用场景1：复合操作
    private volatile int counter = 0;

    public void incorrectIncrement() {
        counter++;  // 不是原子操作，不安全
    }

    // ✗ 不适用场景2：依赖当前值的更新
    private volatile int value = 0;

    public void incorrectConditionalUpdate() {
        if (value < 10) {
            value++;  // 检查和更新之间可能被其他线程修改
        }
    }

    // 正确的原子操作替代方案
    private final AtomicInteger atomicCounter = new AtomicInteger(0);

    public void correctIncrement() {
        atomicCounter.incrementAndGet();
    }

    public void correctConditionalUpdate() {
        atomicCounter.updateAndGet(current -> current < 10 ? current + 1 : current);
    }
}
```

##### 7.2 常见陷阱
[](#72-常见陷阱)
```
public class VolatileTraps {

    // 陷阱1：数组元素不是volatile的
    private volatile int[] array = new int[10];

    public void arrayTrap() {
        array[0] = 42;  // 数组元素的修改不保证可见性！
        // 只有数组引用的修改才是volatile的
        array = new int[20];  // 这个赋值是volatile的
    }

    // 陷阱2：对象字段不是volatile的
    private volatile Point point = new Point(0, 0);

    public void objectFieldTrap() {
        point.x = 10;  // 对象字段的修改不保证可见性！
        // 只有引用的修改才是volatile的
        point = new Point(10, 20);  // 这个赋值是volatile的
    }

    // 陷阱3：long和double的非原子性
    private volatile long volatileLong = 0L;
    private long normalLong = 0L;

    public void longTrap() {
        // volatile保证long/double读写的原子性
        volatileLong = 123456789L;  // 原子操作

        // 普通long/double可能被分解为两个32位操作
        normalLong = 123456789L;    // 可能不是原子操作
    }

    static class Point {
        int x, y;
        Point(int x, int y) { this.x = x; this.y = y; }
    }
}
```

#### 8. 面试重点
[](#8-面试重点)
1. **volatile的两个核心特性：可见性和禁止重排序**
2. **volatile与synchronized的区别**
3. **volatile不保证原子性的原因和示例**
4. **双重检查锁定模式中volatile的作用**
5. **volatile的适用场景和不适用场景**
6. **内存屏障的概念和作用**
7. **JMM中volatile的实现原理**
8. **volatile与原子类的性能对比**

#### 9. 常见面试问题
[](#9-常见面试问题)
**Q1: 为什么volatile不能保证原子性？**A: volatile只保证可见性和禁止重排序，但复合操作（如i++）包含读-修改-写三个步骤，这三个步骤之间可能被其他线程打断，因此不是原子的。

**Q2: volatile在双重检查锁定中的作用？**A: 防止对象实例化过程中的指令重排序。没有volatile，instance = new Singleton()可能被重排序，导致其他线程获取到未完全初始化的对象。

**Q3: 什么时候应该使用volatile而不是synchronized？**A: 当只需要保证可见性而不需要原子性时使用volatile，如状态标志、配置变量等。volatile性能更好，不会造成线程阻塞。