### 核心要点
[](#核心要点)
**Spring AOP**通过代理模式实现切面编程，主要使用**JDK 动态代理**（针对接口）和**CGLIB**（针对类）两种代理方式，在运行时织入横切关注点，实现与业务逻辑的解耦。JDK 动态代理基于反射和接口，CGLIB 基于字节码生成和继承。

### 详细解答
[](#详细解答)
#### 1. Spring AOP 基础概念
[](#1-spring-aop-基础概念)
##### 1.1 AOP 核心术语
[](#11-aop-核心术语)
**切面（Aspect）**

- 横切关注点的模块化，如日志、事务、安全等
- 由切点和通知组成

**连接点（Join Point）**

- 程序执行过程中能够应用通知的点
- 在Spring AOP中，连接点总是方法调用

**切点（Pointcut）**

- 匹配连接点的谓词表达式
- 定义了通知应该在哪些连接点执行

**通知（Advice）**

- 在特定连接点执行的代码
- 类型：@Before、@After、@Around、@AfterReturning、@AfterThrowing

**织入（Weaving）**

- 将切面应用到目标对象的过程
- Spring AOP使用运行时织入

##### 1.2 AOP 实现方式对比
[](#12-aop-实现方式对比)
```
// 原始业务方法
public class UserService {
    public User getUser(Long id) {
        // 业务逻辑
        return userRepository.findById(id);
    }
}

// AOP增强后的效果
public class UserServiceProxy {
    public User getUser(Long id) {
        // @Before 通知
        logBefore();

        try {
            // 目标方法调用
            User result = target.getUser(id);

            // @AfterReturning 通知
            logAfterReturning(result);
            return result;
        } catch (Exception e) {
            // @AfterThrowing 通知
            logAfterThrowing(e);
            throw e;
        } finally {
            // @After 通知
            logAfter();
        }
    }
}
```

#### 2. JDK 动态代理实现原理
[](#2-jdk-动态代理实现原理)
##### 2.1 JDK 动态代理机制
[](#21-jdk-动态代理机制)
**核心组件：**

- `java.lang.reflect.Proxy`：代理类生成器
- `InvocationHandler`：方法调用处理器
- 目标对象必须实现接口

**实现原理：**

```
// 1. 定义接口
public interface UserService {
    User getUser(Long id);
    void saveUser(User user);
}

// 2. 实现类
public class UserServiceImpl implements UserService {
    @Override
    public User getUser(Long id) {
        System.out.println("Getting user: " + id);
        return new User(id, "Test User");
    }

    @Override
    public void saveUser(User user) {
        System.out.println("Saving user: " + user);
    }
}

// 3. 调用处理器
public class AopInvocationHandler implements InvocationHandler {
    private final Object target;
    private final List<MethodInterceptor> interceptors;

    public AopInvocationHandler(Object target, List<MethodInterceptor> interceptors) {
        this.target = target;
        this.interceptors = interceptors;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 创建方法调用链
        MethodInvocation invocation = new ReflectiveMethodInvocation(
            proxy, target, method, args, target.getClass(), interceptors);

        // 执行拦截器链
        return invocation.proceed();
    }
}

// 4. 创建代理
public class JdkProxyFactory {
    public static <T> T createProxy(T target, List<MethodInterceptor> interceptors) {
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            new AopInvocationHandler(target, interceptors)
        );
    }
}
```

##### 2.2 Spring 中的 JDK 动态代理
[](#22-spring-中的-jdk-动态代理)
**JdkDynamicAopProxy 源码分析：**

```
final class JdkDynamicAopProxy implements AopProxy, InvocationHandler {
    private final AdvisedSupport advised;

    public JdkDynamicAopProxy(AdvisedSupport config) throws AopConfigException {
        this.advised = config;
    }

    @Override
    public Object getProxy(@Nullable ClassLoader classLoader) {
        if (logger.isTraceEnabled()) {
            logger.trace("Creating JDK dynamic proxy: " + this.advised.getTargetSource());
        }

        Class<?>[] proxiedInterfaces = AopProxyUtils.completeProxiedInterfaces(this.advised, true);
        findDefinedEqualsAndHashCodeMethods(proxiedInterfaces);

        return Proxy.newProxyInstance(classLoader, proxiedInterfaces, this);
    }

    @Override
    @Nullable
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        Object oldProxy = null;
        boolean setProxyContext = false;

        TargetSource targetSource = this.advised.targetSource;
        Object target = null;

        try {
            // 处理 equals 和 hashCode 方法
            if (!this.equalsDefined && AopUtils.isEqualsMethod(method)) {
                return equals(args[0]);
            }
            else if (!this.hashCodeDefined && AopUtils.isHashCodeMethod(method)) {
                return hashCode();
            }

            // 获取方法的拦截器链
            List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);

            if (chain.isEmpty()) {
                // 没有拦截器，直接调用目标方法
                Object[] argsToUse = AopProxyUtils.adaptArgumentsIfNecessary(method, args);
                retVal = AopUtils.invokeJoinpointUsingReflection(target, method, argsToUse);
            }
            else {
                // 创建方法调用并执行拦截器链
                MethodInvocation invocation =
                    new ReflectiveMethodInvocation(proxy, target, method, args, targetClass, chain);
                retVal = invocation.proceed();
            }

            return retVal;
        }
        finally {
            if (target != null && !targetSource.isStatic()) {
                targetSource.releaseTarget(target);
            }
            if (setProxyContext) {
                AopContext.setCurrentProxy(oldProxy);
            }
        }
    }
}
```

#### 3. CGLIB 代理实现原理
[](#3-cglib-代理实现原理)
##### 3.1 CGLIB 基础机制
[](#31-cglib-基础机制)
**核心特点：**

- 基于 ASM 字节码生成框架
- 通过继承方式创建代理类
- 不需要接口，可以代理普通类
- 不能代理 final 类和 final 方法

**CGLIB 代理示例：**

```
// 1. 目标类（无需接口）
public class UserService {
    public User getUser(Long id) {
        System.out.println("Getting user: " + id);
        return new User(id, "Test User");
    }

    public void saveUser(User user) {
        System.out.println("Saving user: " + user);
    }
}

// 2. CGLIB 方法拦截器
public class CglibMethodInterceptor implements MethodInterceptor {
    private final Object target;
    private final List<org.aopalliance.intercept.MethodInterceptor> interceptors;

    public CglibMethodInterceptor(Object target, List<org.aopalliance.intercept.MethodInterceptor> interceptors) {
        this.target = target;
        this.interceptors = interceptors;
    }

    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
        // 创建 CGLIB 方法调用
        CglibMethodInvocation invocation = new CglibMethodInvocation(
            obj, target, method, args, target.getClass(), interceptors, proxy);

        return invocation.proceed();
    }
}

// 3. CGLIB 代理工厂
public class CglibProxyFactory {
    public static <T> T createProxy(T target, List<org.aopalliance.intercept.MethodInterceptor> interceptors) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(target.getClass());
        enhancer.setCallback(new CglibMethodInterceptor(target, interceptors));

        return (T) enhancer.create();
    }
}
```

##### 3.2 Spring 中的 CGLIB 代理
[](#32-spring-中的-cglib-代理)
**CglibAopProxy 源码分析：**

```
class CglibAopProxy implements AopProxy, Serializable {
    private final AdvisedSupport advised;
    private Object[] constructorArgs;
    private Class<?>[] constructorArgTypes;

    public CglibAopProxy(AdvisedSupport config) throws AopConfigException {
        this.advised = config;
    }

    @Override
    public Object getProxy(@Nullable ClassLoader classLoader) {
        try {
            Class<?> rootClass = this.advised.getTargetClass();
            Class<?> proxySuperClass = rootClass;

            // 处理已经是 CGLIB 代理的情况
            if (rootClass.getName().contains(ClassUtils.CGLIB_CLASS_SEPARATOR)) {
                proxySuperClass = rootClass.getSuperclass();
                Class<?>[] additionalInterfaces = rootClass.getInterfaces();
                for (Class<?> additionalInterface : additionalInterfaces) {
                    this.advised.addInterface(additionalInterface);
                }
            }

            // 创建 Enhancer
            Enhancer enhancer = createEnhancer();
            if (classLoader != null) {
                enhancer.setClassLoader(classLoader);
            }

            enhancer.setSuperclass(proxySuperClass);
            enhancer.setInterfaces(AopProxyUtils.completeProxiedInterfaces(this.advised));
            enhancer.setNamingPolicy(SpringNamingPolicy.INSTANCE);
            enhancer.setStrategy(new ClassLoaderAwareGeneratorStrategy(classLoader));

            // 设置回调
            Callback[] callbacks = getCallbacks(rootClass);
            Class<?>[] types = new Class<?>[callbacks.length];
            for (int x = 0; x < types.length; x++) {
                types[x] = callbacks[x].getClass();
            }
            enhancer.setCallbackTypes(types);

            // 创建代理实例
            return createProxyClassAndInstance(enhancer, callbacks);
        }
        catch (CodeGenerationException | IllegalArgumentException ex) {
            throw new AopConfigException("Could not generate CGLIB subclass of " + this.advised.getTargetClass(), ex);
        }
    }

    private Callback[] getCallbacks(Class<?> rootClass) throws Exception {
        // 主要的方法拦截器
        Callback aopInterceptor = new DynamicAdvisedInterceptor(this.advised);

        // 其他回调（如 equals、hashCode 等）
        Callback[] mainCallbacks = new Callback[] {
            aopInterceptor,  // AOP 拦截器
            targetInterceptor,  // 目标方法直接调用
            new SerializableNoOp(),  // 序列化占位符
            targetDispatcher,  // 分发器
            this.advisedDispatcher,  // Advised 接口分发器
            new EqualsInterceptor(this.advised),  // equals 方法拦截器
            new HashCodeInterceptor(this.advised)  // hashCode 方法拦截器
        };

        return mainCallbacks;
    }
}
```

**DynamicAdvisedInterceptor 拦截器：**

```
private static class DynamicAdvisedInterceptor implements MethodInterceptor, Serializable {
    private final AdvisedSupport advised;

    public DynamicAdvisedInterceptor(AdvisedSupport advised) {
        this.advised = advised;
    }

    @Override
    @Nullable
    public Object intercept(Object proxy, Method method, Object[] args, MethodProxy methodProxy) throws Throwable {
        Object oldProxy = null;
        boolean setProxyContext = false;
        Object target = null;
        TargetSource targetSource = this.advised.getTargetSource();

        try {
            if (this.advised.exposeProxy) {
                oldProxy = AopContext.setCurrentProxy(proxy);
                setProxyContext = true;
            }

            target = targetSource.getTarget();
            Class<?> targetClass = (target != null ? target.getClass() : null);

            // 获取拦截器链
            List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);

            Object retVal;
            if (chain.isEmpty() && Modifier.isPublic(method.getModifiers())) {
                // 没有拦截器且是公共方法，直接调用
                Object[] argsToUse = AopProxyUtils.adaptArgumentsIfNecessary(method, args);
                retVal = methodProxy.invoke(target, argsToUse);
            }
            else {
                // 创建 CGLIB 方法调用
                retVal = new CglibMethodInvocation(proxy, target, method, args, targetClass, chain, methodProxy).proceed();
            }

            retVal = processReturnType(proxy, target, method, retVal);
            return retVal;
        }
        finally {
            if (target != null && !targetSource.isStatic()) {
                targetSource.releaseTarget(target);
            }
            if (setProxyContext) {
                AopContext.setCurrentProxy(oldProxy);
            }
        }
    }
}
```

#### 4. JDK 动态代理 vs CGLIB 对比
[](#4-jdk-动态代理-vs-cglib-对比)
##### 4.1 技术实现对比
[](#41-技术实现对比)
| 特性     | JDK 动态代理       | CGLIB                |
| -------- | ------------------ | -------------------- |
| 实现方式 | 基于接口和反射     | 基于继承和字节码生成 |
| 代理条件 | 目标类必须实现接口 | 目标类不能是final    |
| 代理类型 | 接口代理           | 类代理               |
| 性能     | 创建快，调用相对慢 | 创建慢，调用快       |
| JDK 版本 | JDK 原生支持       | 需要第三方库         |
| 方法限制 | 只能代理接口方法   | 不能代理final方法    |

##### 4.2 性能对比分析
[](#42-性能对比分析)
**创建代理性能：**

```
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
public class ProxyCreationBenchmark {

    @Benchmark
    public Object createJdkProxy() {
        return Proxy.newProxyInstance(
            UserService.class.getClassLoader(),
            new Class[]{UserService.class},
            (proxy, method, args) -> method.invoke(target, args)
        );
    }

    @Benchmark
    public Object createCglibProxy() {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(UserServiceImpl.class);
        enhancer.setCallback((MethodInterceptor) (obj, method, args, proxy) -> proxy.invokeSuper(obj, args));
        return enhancer.create();
    }
}

// 结果示例：
// JDK 动态代理创建：约 100-200 ns
// CGLIB 代理创建：约 1000-2000 ns
```

**方法调用性能：**

```
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
public class ProxyInvocationBenchmark {

    @Benchmark
    public Object invokeJdkProxy() throws Throwable {
        return jdkProxy.getUser(1L);
    }

    @Benchmark
    public Object invokeCglibProxy() {
        return cglibProxy.getUser(1L);
    }

    @Benchmark
    public Object invokeDirectly() {
        return target.getUser(1L);
    }
}

// 结果示例：
// 直接调用：约 1-2 ns
// CGLIB 代理调用：约 5-10 ns
// JDK 动态代理调用：约 10-20 ns
```

#### 5. Spring AOP 代理选择策略
[](#5-spring-aop-代理选择策略)
##### 5.1 代理选择逻辑
[](#51-代理选择逻辑)
**DefaultAopProxyFactory 源码：**

```
public class DefaultAopProxyFactory implements AopProxyFactory, Serializable {

    @Override
    public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
        // 1. 检查是否强制使用 CGLIB
        if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
            Class<?> targetClass = config.getTargetClass();
            if (targetClass == null) {
                throw new AopConfigException("TargetSource cannot determine target class: " +
                        "Either an interface or a target is required for proxy creation.");
            }

            // 2. 如果目标类是接口或已经是代理类，使用 JDK 动态代理
            if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
                return new JdkDynamicAopProxy(config);
            }

            // 3. 否则使用 CGLIB
            return new ObjenesisCglibAopProxy(config);
        }
        else {
            // 4. 默认使用 JDK 动态代理
            return new JdkDynamicAopProxy(config);
        }
    }

    private boolean hasNoUserSuppliedProxyInterfaces(AdvisedSupport config) {
        Class<?>[] ifcs = config.getProxiedInterfaces();
        return (ifcs.length == 0 || (ifcs.length == 1 && SpringProxy.class.isAssignableFrom(ifcs[0])));
    }
}
```

##### 5.2 配置代理方式
[](#52-配置代理方式)
**Spring Boot 配置：**

```
# application.yml
spring:
  aop:
    proxy-target-class: true  # 强制使用 CGLIB
    auto: true                # 启用 AOP
```

**Java 配置：**

```
@Configuration
@EnableAspectJAutoProxy(proxyTargetClass = true)  // 强制使用 CGLIB
public class AopConfig {

    @Bean
    public LoggingAspect loggingAspect() {
        return new LoggingAspect();
    }
}
```

**XML 配置：**

```
<!-- 启用 AOP 并强制使用 CGLIB -->
<aop:aspectj-autoproxy proxy-target-class="true"/>

<!-- 或者 -->
<aop:config proxy-target-class="true">
    <aop:aspect ref="loggingAspect">
        <aop:pointcut id="serviceMethods" expression="execution(* com.example.service.*.*(..))"/>
        <aop:before pointcut-ref="serviceMethods" method="logBefore"/>
    </aop:aspect>
</aop:config>
```

#### 6. 实际应用案例
[](#6-实际应用案例)
##### 6.1 事务管理 AOP
[](#61-事务管理-aop)
**声明式事务实现：**

```
@Aspect
@Component
public class TransactionAspect {

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Around("@annotation(transactional)")
    public Object handleTransaction(ProceedingJoinPoint pjp, Transactional transactional) throws Throwable {
        // 创建事务定义
        DefaultTransactionDefinition def = new DefaultTransactionDefinition();
        def.setPropagationBehavior(transactional.propagation().value());
        def.setIsolationLevel(transactional.isolation().value());
        def.setReadOnly(transactional.readOnly());
        def.setTimeout(transactional.timeout());

        // 开始事务
        TransactionStatus status = transactionManager.getTransaction(def);

        try {
            // 执行目标方法
            Object result = pjp.proceed();

            // 提交事务
            transactionManager.commit(status);
            return result;
        } catch (Exception e) {
            // 回滚事务
            transactionManager.rollback(status);
            throw e;
        }
    }
}
```

##### 6.2 缓存 AOP
[](#62-缓存-aop)
**缓存切面实现：**

```
@Aspect
@Component
public class CacheAspect {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Around("@annotation(cacheable)")
    public Object handleCache(ProceedingJoinPoint pjp, Cacheable cacheable) throws Throwable {
        // 生成缓存键
        String key = generateKey(pjp, cacheable);

        // 尝试从缓存获取
        Object cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return cached;
        }

        // 执行目标方法
        Object result = pjp.proceed();

        // 存入缓存
        if (result != null) {
            redisTemplate.opsForValue().set(key, result,
                Duration.ofSeconds(cacheable.expire()));
        }

        return result;
    }

    private String generateKey(ProceedingJoinPoint pjp, Cacheable cacheable) {
        String className = pjp.getTarget().getClass().getSimpleName();
        String methodName = pjp.getSignature().getName();
        String argsHash = Arrays.hashCode(pjp.getArgs());

        return String.format("%s:%s:%s:%s",
            cacheable.value(), className, methodName, argsHash);
    }
}
```

##### 6.3 日志和监控 AOP
[](#63-日志和监控-aop)
**综合监控切面：**

```
@Aspect
@Component
@Slf4j
public class MonitoringAspect {

    @Autowired
    private MeterRegistry meterRegistry;

    @Around("@annotation(monitor)")
    public Object monitor(ProceedingJoinPoint pjp, Monitor monitor) throws Throwable {
        String methodName = pjp.getSignature().getName();
        String className = pjp.getTarget().getClass().getSimpleName();

        // 创建计时器
        Timer.Sample sample = Timer.start(meterRegistry);

        // 记录开始日志
        log.info("Method started: {}.{}", className, methodName);

        try {
            // 执行目标方法
            Object result = pjp.proceed();

            // 记录成功指标
            Counter.builder("method.success")
                .tag("class", className)
                .tag("method", methodName)
                .register(meterRegistry)
                .increment();

            log.info("Method completed successfully: {}.{}", className, methodName);
            return result;

        } catch (Exception e) {
            // 记录失败指标
            Counter.builder("method.error")
                .tag("class", className)
                .tag("method", methodName)
                .tag("exception", e.getClass().getSimpleName())
                .register(meterRegistry)
                .increment();

            log.error("Method failed: {}.{}, error: {}", className, methodName, e.getMessage(), e);
            throw e;

        } finally {
            // 记录执行时间
            sample.stop(Timer.builder("method.duration")
                .tag("class", className)
                .tag("method", methodName)
                .register(meterRegistry));
        }
    }
}
```

#### 7. 性能调优和最佳实践
[](#7-性能调优和最佳实践)
##### 7.1 代理选择最佳实践
[](#71-代理选择最佳实践)
**选择建议：**

```
// 1. 有接口的情况 - 优先 JDK 动态代理
public interface UserService {
    User getUser(Long id);
}

@Service
public class UserServiceImpl implements UserService {
    @Override
    public User getUser(Long id) {
        // 实现逻辑
    }
}

// 2. 没有接口或需要代理类方法 - 使用 CGLIB
@Service
public class OrderService {  // 没有接口
    public Order getOrder(Long id) {
        // 实现逻辑
    }
}

// 3. 大量代理创建场景 - 考虑 JDK 动态代理
@Configuration
public class PerformanceOptimizedConfig {

    @Bean
    @ConditionalOnProperty(name = "app.proxy.strategy", havingValue = "jdk")
    public ProxyConfig jdkProxyConfig() {
        return ProxyConfig.builder()
            .proxyTargetClass(false)  // 使用 JDK 动态代理
            .build();
    }
}
```

##### 7.2 切点表达式优化
[](#72-切点表达式优化)
**高效切点表达式：**

```
@Aspect
@Component
public class OptimizedAspect {

    // ❌ 效率低：匹配所有方法再过滤
    @Pointcut("execution(* *.*(..)) && @annotation(Log)")
    public void inefficientPointcut() {}

    // ✅ 效率高：直接匹配包和注解
    @Pointcut("execution(* com.example.service..*.*(..)) && @annotation(Log)")
    public void efficientPointcut() {}

    // ✅ 更精确的匹配
    @Pointcut("within(com.example.service..*) && @annotation(Transactional)")
    public void transactionalServiceMethods() {}
}
```

##### 7.3 避免代理失效
[](#73-避免代理失效)
**常见代理失效场景：**

```
@Service
public class UserService {

    // ❌ 自调用不会触发代理
    @Transactional
    public void updateUser(User user) {
        validateUser(user);  // 这里不会触发事务
        // ...
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void validateUser(User user) {
        // 验证逻辑
    }

    // ✅ 通过注入自己来解决
    @Autowired
    private UserService self;

    @Transactional
    public void updateUserCorrect(User user) {
        self.validateUser(user);  // 这样会触发代理
        // ...
    }

    // ✅ 或者通过 AopContext 获取代理
    @Transactional
    public void updateUserWithAopContext(User user) {
        ((UserService) AopContext.currentProxy()).validateUser(user);
        // ...
    }
}
```

#### 8. 故障排查和调试
[](#8-故障排查和调试)
##### 8.1 代理问题诊断
[](#81-代理问题诊断)
**检查代理类型：**

```
@Component
public class ProxyDiagnostics {

    public void diagnoseProxy(Object bean) {
        if (AopUtils.isAopProxy(bean)) {
            if (AopUtils.isJdkDynamicProxy(bean)) {
                System.out.println("JDK Dynamic Proxy: " + bean.getClass());
                System.out.println("Proxied interfaces: " + Arrays.toString(bean.getClass().getInterfaces()));
            } else if (AopUtils.isCglibProxy(bean)) {
                System.out.println("CGLIB Proxy: " + bean.getClass());
                System.out.println("Target class: " + AopUtils.getTargetClass(bean));
            }

            // 获取目标对象
            try {
                Object target = ((Advised) bean).getTargetSource().getTarget();
                System.out.println("Target object: " + target.getClass());
            } catch (Exception e) {
                System.out.println("Cannot access target: " + e.getMessage());
            }
        } else {
            System.out.println("Not a proxy: " + bean.getClass());
        }
    }
}
```

##### 8.2 切面执行调试
[](#82-切面执行调试)
**调试切面执行：**

```
@Aspect
@Component
@Slf4j
public class DebuggingAspect {

    @Around("execution(* com.example.service..*.*(..))")
    public Object debugMethod(ProceedingJoinPoint pjp) throws Throwable {
        String signature = pjp.getSignature().toShortString();

        log.debug("Before method: {}", signature);
        log.debug("Arguments: {}", Arrays.toString(pjp.getArgs()));

        long startTime = System.currentTimeMillis();

        try {
            Object result = pjp.proceed();

            long endTime = System.currentTimeMillis();
            log.debug("After method: {}, duration: {}ms", signature, endTime - startTime);
            log.debug("Result: {}", result);

            return result;
        } catch (Exception e) {
            log.error("Exception in method: {}, error: {}", signature, e.getMessage());
            throw e;
        }
    }
}
```

#### 总结
[](#总结)
Spring AOP 的实现原理体现了设计模式在框架中的巧妙应用：

**核心机制：**

1. **JDK 动态代理**：基于接口和反射，适合面向接口编程场景
2. **CGLIB 代理**：基于继承和字节码生成，适合类代理场景
3. **代理选择策略**：Spring 智能选择最适合的代理方式

**技术优势：**

- **解耦合**：将横切关注点与业务逻辑分离
- **可重用**：切面可以应用到多个类和方法
- **灵活性**：支持多种通知类型和切点表达式

**实践要点：**

- 理解两种代理方式的特点和适用场景
- 正确配置代理策略以获得最佳性能
- 避免自调用等常见代理失效问题
- 合理设计切点表达式以提高执行效率

掌握 Spring AOP 的实现原理对于深入理解 Spring 框架、进行性能调优和解决实际问题都具有重要意义。