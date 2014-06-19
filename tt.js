function的返回值
当function为一般函数，则返回值为方法体的返回类型
var foo = function()
{
    return ;123
};
console.log(Object.prototype.toString.call(foo()));//输出[object Number]


当function为构造函数，new操作，会自动创建一个object，然后将object.prototype=构造函数.prototype，则return实例化对象情况如下：
1、当返回原始类型string/number/boolean/undefined/null，则实例化为object
var foo = function()
{
    return 123;
};
console.log(Object.prototype.toString.call(new foo()));//输出[object Object]


2、当返回其它类型object/function/array/dom，则实例化为返回对象
var foo = function()
{
    return [];
};
console.log(Object.prototype.toString.call(new foo()));//输出[object Array]


this的指向
原则：指向调用它的对象
公式：[obj.]fn();	//fn内的this指向obj
场景1：若无obj，则obj为全局对象，如global/window
var obj = {
    a : 1 ,
    fn : function()
    {
        console.log(this.a);
    }
};
obj.fn();//输出：1
var a = 1 ,
    obj = {
        a : 2 ,
        fn : function()
        {
            console.log(this.a);
            var f1 = function()
            {
                console.log(this.a);
            }
            f1();
            var that = this ,
                f2 = function()
                {
                    console.log(that.a);
                }
            f2();
        }
    };
obj.fn();//输出为2,1,2 分析：f1是由global调用的,f2中的that为obj
场景2：改变引用
var a = 1 ,
    obj1 = {
        a : 2 ,
        fn : function()
        {
            console.log(this.a);
        }
    };
obj1.fn()//输出为2
var f = obj1.fn;
f();//输出为1 分析：由global调用
var obj2 = {
    a : 3 ,
    f2 : obj1.fn
};
obj2.f2();//输出为3 分析：由obj2调用


场景3：apply call 的应用
var obj = {
    a : 1 ,
    fn : function(b)
    {
        console.log(this.a + b);
    }
};
obj.fn(1);//输出为2
var obj1 = {
    a : 2
}
obj.fn.call(obj1 , 1);//输出为3
obj.fn.apply(obj1 , [2]);//输出为4


场景4：构造函数 new 后，指向实例化对象
var construct = function()
{
    this.a = 1;
    this.fn = function()
    {
        console.log(this.a);
    }
}
var obj = new construct();
obj.fn();//输出1


场景5：回调函数
var a = 1 ,
    obj = {
        a : 2 ,
        fn : function(f)
        {
            console.log(this.a);
            f();
            f.call(this);
        }
    };
obj.fn(function(){
    console.log(this.a);
});//输出2,1,2 分析：回调的函数是由global调用





prototype 与 __proto__
var obj = new construct();
//1、对象obj有__proto__，无prototype
//2、类construct有prototype，无__proto__
//3、new的作用：obj.__proto__ =（指向） construct.prototype，由此实现原型链继承，原型链上的属性和方法被实例化对象共享
//OO概念，对象 是 成员属性 + 成员方法 的集合。实例化时，只需要拥有各自的成员属性，成员方法只是对成员属性操作的可执行代码（行为模式、接口）而已，这段代码为所有的实例共享。
//继承时，用对象冒充复制父类成员属性，用原型链防止父类成员方法的副本重建。
function Person(name)
{
    this.name = name;
}
Person.prototype.say = function()
{
    console.log(this.name);
}
function Student(name , id)
{
    P冒充，改变this指向
    this.id = id;erson.call(this , name);//对象
}
Student.prototype = new Person();//实例化父类时不能带参数，因为对子类prototype的修改是在声明子类之后才能进行，用子类构造函数的参数初始化父类属性是无法实现new Person(this.name)
Student.prototype.show = function()
{
    console.log([this.name , this.id]);
}
var obj = new Student('a' , 1);
obj.say();
obj.show();
