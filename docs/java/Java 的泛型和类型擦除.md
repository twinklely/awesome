# Java的泛型和类型擦除

### 核心要点
[](#核心要点)
- **泛型是编译时类型安全机制**：在编译期提供类型检查，运行时类型信息被擦除
- **类型擦除原理**：泛型信息只存在于源码和字节码，JVM运行时不保留具体类型参数
- **通配符机制**：? extends（上界）、? super（下界）解决协变和逆变问题
- **泛型限制**：不能用于静态上下文、数组创建、instanceof检查等

### 详细解答
[](#详细解答)
#### 1. 泛型的基本概念
[](#1-泛型的基本概念)
泛型（Generics）是Java 5引入的重要特性，提供了编译时的类型安全检查，消除了类型转换的需要，并支持编写更通用的代码。

**泛型的优势：**

- 编译时类型安全，减少ClassCastException
- 消除类型转换，提高代码可读性
- 支持泛型算法，代码复用性更强

#### 2. 泛型的基本语法
[](#2-泛型的基本语法)
##### 泛型类
[](#泛型类)
```
// 单个类型参数
public class Box<T> {
    private T content;

    public void setContent(T content) {
        this.content = content;
    }

    public T getContent() {
        return content;
    }
}

// 多个类型参数
public class Pair<K, V> {
    private K key;
    private V value;

    public Pair(K key, V value) {
        this.key = key;
        this.value = value;
    }

    public K getKey() { return key; }
    public V getValue() { return value; }
}

// 使用示例
Box<String> stringBox = new Box<>();
stringBox.setContent("Hello");
String content = stringBox.getContent(); // 无需强制转换

Pair<String, Integer> pair = new Pair<>("age", 25);
```

##### 泛型方法
[](#泛型方法)
```
public class GenericMethods {

    // 泛型方法
    public static <T> void swap(T[] array, int i, int j) {
        T temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    // 多个类型参数的泛型方法
    public static <T, U> boolean compare(Pair<T, U> p1, Pair<T, U> p2) {
        return p1.getKey().equals(p2.getKey()) &&
               p1.getValue().equals(p2.getValue());
    }

    // 有界类型参数
    public static <T extends Number> double sumOfList(List<T> list) {
        double sum = 0.0;
        for (T item : list) {
            sum += item.doubleValue();
        }
        return sum;
    }
}
```

##### 泛型接口
[](#泛型接口)
```
public interface Comparable<T> {
    int compareTo(T other);
}

public interface Repository<T, ID> {
    T findById(ID id);
    List<T> findAll();
    void save(T entity);
    void deleteById(ID id);
}

// 实现泛型接口
public class UserRepository implements Repository<User, Long> {
    @Override
    public User findById(Long id) {
        // 实现逻辑
        return null;
    }

    @Override
    public List<User> findAll() {
        // 实现逻辑
        return null;
    }

    // ... 其他方法实现
}
```

#### 3. 通配符详解
[](#3-通配符详解)
##### 上界通配符（? extends）
[](#上界通配符-extends)
```
// 只能读取，不能写入（除了null）
List<? extends Number> numberList = new ArrayList<Integer>();
Number num = numberList.get(0); // 可以读取
// numberList.add(10); // 编译错误，不能写入

// 实际应用示例
public static double sumOfNumbers(List<? extends Number> numbers) {
    double sum = 0.0;
    for (Number num : numbers) {
        sum += num.doubleValue();
    }
    return sum;
}

// 可以接受List<Integer>, List<Double>, List<Float>等
List<Integer> intList = Arrays.asList(1, 2, 3);
List<Double> doubleList = Arrays.asList(1.1, 2.2, 3.3);
sumOfNumbers(intList);   // 正确
sumOfNumbers(doubleList); // 正确
```

##### 下界通配符（? super）
[](#下界通配符-super)
```
// 只能写入，读取时只能确保是Object类型
List<? super Integer> intList = new ArrayList<Number>();
intList.add(10);      // 可以写入Integer及其子类
intList.add(100);     // 可以写入
Object obj = intList.get(0); // 读取时只能是Object

// 实际应用示例
public static void addNumbers(List<? super Integer> list) {
    list.add(1);
    list.add(2);
    list.add(3);
}

List<Number> numberList = new ArrayList<>();
List<Object> objectList = new ArrayList<>();
addNumbers(numberList);  // 正确
addNumbers(objectList);  // 正确
```

##### 无界通配符（?）
[](#无界通配符)
```
// 表示未知类型，只能调用Object的方法
List<?> unknownList = new ArrayList<String>();
Object item = unknownList.get(0);
// unknownList.add("test"); // 编译错误，不能添加任何元素（除了null）

// 实际应用
public static void printList(List<?> list) {
    for (Object item : list) {
        System.out.println(item);
    }
}
```

#### 4. 类型擦除深入理解
[](#4-类型擦除深入理解)
##### 擦除过程
[](#擦除过程)
```
// 编译前的泛型代码
public class GenericClass<T> {
    private T data;

    public void setData(T data) {
        this.data = data;
    }

    public T getData() {
        return data;
    }
}

// 编译后的字节码等效代码（类型擦除后）
public class GenericClass {
    private Object data;  // T被擦除为Object

    public void setData(Object data) {
        this.data = data;
    }

    public Object getData() {
        return data;
    }
}
```

##### 有界类型的擦除
[](#有界类型的擦除)
```
// 有界泛型
public class BoundedGeneric<T extends Number> {
    private T value;

    public T getValue() {
        return value;
    }
}

// 擦除后变为
public class BoundedGeneric {
    private Number value;  // T extends Number被擦除为Number

    public Number getValue() {
        return value;
    }
}
```

##### 桥接方法（Bridge Methods）
[](#桥接方法bridge-methods)
```
// 泛型类
class Node<T> {
    public T data;

    public Node(T data) { this.data = data; }

    public void setData(T data) {
        System.out.println("Node.setData");
        this.data = data;
    }
}

// 继承泛型类
class MyNode extends Node<Integer> {
    public MyNode(Integer data) { super(data); }

    // 重写方法
    public void setData(Integer data) {
        System.out.println("MyNode.setData");
        super.setData(data);
    }
}

// 编译器会自动生成桥接方法保持多态性
// 生成的桥接方法（编译器自动添加）：
public void setData(Object data) {
    setData((Integer) data);  // 调用实际的setData(Integer)方法
}
```

#### 5. 类型擦除的影响和限制
[](#5-类型擦除的影响和限制)
##### 运行时类型信息丢失
[](#运行时类型信息丢失)
```
List<String> stringList = new ArrayList<>();
List<Integer> intList = new ArrayList<>();

// 运行时类型相同
System.out.println(stringList.getClass() == intList.getClass()); // true
System.out.println(stringList.getClass()); // class java.util.ArrayList

// 无法通过instanceof检查泛型类型
// if (stringList instanceof List<String>) {} // 编译错误
if (stringList instanceof List<?>) {  // 正确的写法
    System.out.println("stringList is a List");
}
```

##### 泛型数组的限制
[](#泛型数组的限制)
```
// 不能创建泛型数组
// List<String>[] stringLists = new List<String>[10]; // 编译错误

// 可以创建通配符数组
List<?>[] wildcardLists = new List<?>[10]; // 正确

// 或者使用Object数组然后转换
@SuppressWarnings("unchecked")
List<String>[] stringLists = (List<String>[]) new List[10];

// 更好的替代方案：使用List代替数组
List<List<String>> listOfLists = new ArrayList<>();
```

##### 静态上下文的限制
[](#静态上下文的限制)
```
public class StaticGenericDemo<T> {
    // 静态字段不能使用类型参数
    // private static T staticField; // 编译错误

    // 静态方法不能使用类型参数
    // public static void staticMethod(T param) {} // 编译错误

    // 但可以在静态方法中定义自己的类型参数
    public static <U> void staticGenericMethod(U param) {
        System.out.println(param);
    }
}
```

#### 6. 获取泛型类型信息的方法
[](#6-获取泛型类型信息的方法)
##### 通过反射获取类型信息
[](#通过反射获取类型信息)
```
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;

// 抽象基类用于获取泛型类型
public abstract class TypeReference<T> {
    private final Type type;

    protected TypeReference() {
        Type superClass = getClass().getGenericSuperclass();
        if (superClass instanceof ParameterizedType) {
            this.type = ((ParameterizedType) superClass).getActualTypeArguments()[0];
        } else {
            throw new RuntimeException("Missing type parameter.");
        }
    }

    public Type getType() {
        return type;
    }
}

// 使用示例
TypeReference<List<String>> typeRef = new TypeReference<List<String>>() {};
System.out.println(typeRef.getType()); // java.util.List<java.lang.String>
```

##### 在运行时保留类型信息
[](#在运行时保留类型信息)
```
public class GenericDAO<T> {
    private final Class<T> entityClass;

    @SuppressWarnings("unchecked")
    public GenericDAO() {
        Type superClass = getClass().getGenericSuperclass();
        ParameterizedType parameterizedType = (ParameterizedType) superClass;
        this.entityClass = (Class<T>) parameterizedType.getActualTypeArguments()[0];
    }

    public T create() {
        try {
            return entityClass.newInstance();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Class<T> getEntityClass() {
        return entityClass;
    }
}

// 具体实现
class UserDAO extends GenericDAO<User> {
    // 可以获取到User的Class对象
}
```

#### 7. 泛型最佳实践
[](#7-泛型最佳实践)
##### PECS原则（Producer Extends Consumer Super）
[](#pecs原则producer-extends-consumer-super)
```
// Producer Extends: 如果你需要一个List提供数据，使用? extends
public void processNumbers(List<? extends Number> numbers) {
    for (Number num : numbers) {
        // 从list中读取数据（Producer）
        System.out.println(num.doubleValue());
    }
}

// Consumer Super: 如果你需要往List中添加数据，使用? super
public void addIntegers(List<? super Integer> numbers) {
    numbers.add(42);     // 往list中写入数据（Consumer）
    numbers.add(100);
}

// 实际应用：Collections.copy方法
public static <T> void copy(List<? super T> dest, List<? extends T> src) {
    for (int i = 0; i < src.size(); i++) {
        dest.set(i, src.get(i));  // src提供数据，dest消费数据
    }
}
```

##### 避免原生类型
[](#避免原生类型)
```
// 错误的做法：使用原生类型
List rawList = new ArrayList();
rawList.add("string");
rawList.add(42);  // 可以添加不同类型，运行时可能出错

// 正确的做法：使用泛型
List<Object> objectList = new ArrayList<>();
objectList.add("string");
objectList.add(42);  // 明确表示可以存储任何类型

// 或者使用具体类型
List<String> stringList = new ArrayList<>();
stringList.add("string");
// stringList.add(42);  // 编译错误，类型安全
```

##### 适当使用有界类型参数
[](#适当使用有界类型参数)
```
// 限制类型参数必须实现Comparable接口
public static <T extends Comparable<T>> T max(List<T> list) {
    if (list.isEmpty()) {
        return null;
    }

    T max = list.get(0);
    for (T item : list) {
        if (item.compareTo(max) > 0) {
            max = item;
        }
    }
    return max;
}

// 多重边界
public interface Drawable {
    void draw();
}

public class Shape implements Drawable {
    public void draw() { /* 实现 */ }
}

// T必须既继承Shape又实现Serializable
public static <T extends Shape & Serializable> void processShape(T shape) {
    shape.draw();  // 可以调用Shape的方法
    // 也可以序列化shape对象
}
```

#### 8. 泛型与设计模式
[](#8-泛型与设计模式)
##### 泛型单例模式
[](#泛型单例模式)
```
public class GenericSingleton<T> {
    private static final Map<Class<?>, Object> instances = new ConcurrentHashMap<>();

    @SuppressWarnings("unchecked")
    public static <T> T getInstance(Class<T> clazz) {
        return (T) instances.computeIfAbsent(clazz, k -> {
            try {
                return k.newInstance();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }
}
```

##### 泛型工厂模式
[](#泛型工厂模式)
```
public interface Factory<T> {
    T create();
}

public class UserFactory implements Factory<User> {
    @Override
    public User create() {
        return new User();
    }
}

public class GenericFactoryManager {
    private final Map<Class<?>, Factory<?>> factories = new HashMap<>();

    public <T> void registerFactory(Class<T> type, Factory<T> factory) {
        factories.put(type, factory);
    }

    @SuppressWarnings("unchecked")
    public <T> T create(Class<T> type) {
        Factory<T> factory = (Factory<T>) factories.get(type);
        if (factory == null) {
            throw new IllegalArgumentException("No factory registered for " + type);
        }
        return factory.create();
    }
}
```

泛型和类型擦除是Java类型系统的重要组成部分，理解其原理和限制对编写高质量的Java代码至关重要。合理使用泛型可以提高代码的类型安全性和可读性，同时保持良好的性能。