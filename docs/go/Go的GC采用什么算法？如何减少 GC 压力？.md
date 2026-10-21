## 要点精炼

- **核心算法**：三色标记法 + 并发标记清除 + 混合写屏障
- **STW 时间**：仅在标记准备和标记终止两个短暂阶段（<1ms）
- **GC 触发**：Pacer 算法动态计算触发时机，目标 GOGC=100（堆增长 100%）
- **优化手段**：减少堆分配、使用 sync.Pool、减少指针、预分配、调整 GOGC

## 详细回答

### GC 算法演进

**Go 1.5+：三色标记 + 并发清除**
- 白色：未标记（待回收）
- 灰色：已标记，但子对象未扫描完成
- 黑色：已标记，且子对象已扫描完成

**Go 1.8+：混合写屏障**
- Dijkstra 插入写屏障 + Yuasa 删除写屏障
- 减少 STW 时间，栈无需重扫

### GC 流程（4 个阶段）

```
1. Mark Setup（STW，约 10-30μs）
   - 开启写屏障
   - 启动标记 worker goroutine
   - 扫描栈根对象

2. 并发标记（Concurrent Marking）
   - 用户代码与 GC 并行执行
   - 扫描根对象（栈、全局变量、寄存器）
   - 扫描堆对象，标记可达对象
   - 写屏障记录指针修改

3. Mark Termination（STW，约 60-90μs）
   - 重新扫描部分栈
   - 关闭写屏障
   - 计算下次 GC 触发阈值

4. 并发清除（Concurrent Sweeping）
   - 将白色对象归还给 mspan
   - 用户代码与清除并行
```

### 写屏障机制

**混合写屏障伪代码：**
```go
// 写操作：*slot = ptr
writePointer(slot, ptr) {
    shade(ptr)       // Dijkstra 插入写屏障：标记新值
    shade(*slot)     // Yuasa 删除写屏障：标记旧值
    *slot = ptr
}
```

**作用：**
- 保证三色不变性：黑色对象不会直接指向白色对象
- 避免对象丢失（并发修改导致可达对象被误回收）

### GC 触发机制

**1. 自动触发（Pacer 算法）**
```go
触发阈值 = 上次 GC 后存活堆大小 × (1 + GOGC/100)

// 默认 GOGC=100，堆增长 100% 时触发
// 例如：上次 GC 后堆 10MB，增长到 20MB 时触发
```

**2. 手动触发**
```go
runtime.GC()  // 阻塞式 GC
```

**3. 定时触发**
```go
// 2 分钟未执行 GC，强制触发
```

### 辅助标记（Mark Assist）

**问题：** 分配速度过快，GC 标记跟不上

**解决：** 分配者必须帮忙标记
```go
func mallocgc(size uintptr) {
    if 当前 GC 标记中 && 分配速度过快 {
        assistG()  // 当前 goroutine 暂停分配，帮忙标记
    }
    // 正常分配
}
```

### 如何减少 GC 压力

**1. 减少堆分配**
```go
// ❌ 频繁分配
for i := 0; i < n; i++ {
    s := []int{1, 2, 3}  // 每次循环都分配到堆
}

// ✅ 预分配 + 复用
s := make([]int, 3)
for i := 0; i < n; i++ {
    s[0], s[1], s[2] = 1, 2, 3
}
```

**2. 使用 sync.Pool 复用对象**
```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func process() {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer bufferPool.Put(buf)
    buf.Reset()
    // 使用 buf
}
```

**3. 减少指针使用**
```go
// ❌ 指针切片（GC 需要扫描每个指针）
type Node struct {
    Value int
    Next  *Node
}

// ✅ 值类型数组（GC 无需扫描）
type Node struct {
    Value int
    NextIndex int  // 用索引代替指针
}
nodes := []Node{...}
```

**4. 预分配切片/map**
```go
// ❌ 频繁扩容
s := []int{}
for i := 0; i < 10000; i++ {
    s = append(s, i)  // 多次扩容，产生垃圾
}

// ✅ 预分配
s := make([]int, 0, 10000)
for i := 0; i < 10000; i++ {
    s = append(s, i)  // 无扩容
}
```

**5. 使用 strings.Builder**
```go
// ❌ 字符串拼接（每次产生新字符串）
s := ""
for i := 0; i < 1000; i++ {
    s += "x"
}

// ✅ strings.Builder
var b strings.Builder
b.Grow(1000)  // 预分配
for i := 0; i < 1000; i++ {
    b.WriteString("x")
}
s := b.String()
```

**6. 调整 GOGC**
```bash
GOGC=200 ./myapp  # 容忍更大堆增长，减少 GC 频率
GOGC=50 ./myapp   # 更频繁 GC，减少内存占用
```

**7. 避免内存泄漏**
```go
// ❌ 切片泄漏
func leak() []int {
    big := make([]int, 1000000)
    return big[:10]  // 保留 10 个元素，但底层数组 100 万仍被引用
}

// ✅ 拷贝独立切片
func fixed() []int {
    big := make([]int, 1000000)
    small := make([]int, 10)
    copy(small, big[:10])
    return small  // big 可以被 GC
}
```

### GC 性能监控

**1. GODEBUG 环境变量**
```bash
GODEBUG=gctrace=1 ./myapp
# 输出：gc 1 @0.005s 0%: 0.018+0.46+0.003 ms clock, ...
```

**2. runtime.ReadMemStats**
```go
var m runtime.MemStats
runtime.ReadMemStats(&m)
fmt.Printf("Alloc = %v MB", m.Alloc / 1024 / 1024)
fmt.Printf("TotalAlloc = %v MB", m.TotalAlloc / 1024 / 1024)
fmt.Printf("NumGC = %v", m.NumGC)
```

**3. pprof 分析**
```bash
go tool pprof http://localhost:6060/debug/pprof/heap
```

### 性能目标

- **STW 时间**：<1ms（现代版本 Go）
- **GC CPU 占用**：<25%（GOGC=100 时）
- **延迟目标**：亚毫秒级暂停