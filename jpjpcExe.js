
/*精品酒瓶厂PLC和HMI现场控制设备，现场设备有，PLC，8路温度检测，温控表，燃烧机，HMI，等，数据由PLC打包送至HMI，HMI直接将打包数据
送至云平台，此解析至需要解析这个报文即可




*/









/*数据解析就是针对消息体部分，因为消息体是DTU加上MQTT的相关结构后打包，所以数据内容完全没有改变，在针对
设备的不同报文，完全可以做出精确的解析，并将属性内容打包后上报到IOT平台的设备相关，但是如果设备一个报文只发送一种属性
那么，数据解析后是不是只能单个上传呢?*/


//修改于2021/03/30 15：54


/*全局定义*/



var WK_DEVICES_SUM=0X05;     //暂定总线上有5台温控设备，温控设备地址从01到05
var TH_SENSORS_SUM=0X05;       //暂定线上有5台温湿度传感器，传感器地址从06到0A

var WK_DEVICES_ADDRESS_1=0X01; //温控设备1#

/*宇电温控常量定义*/

var WK_READ=0x52;		//功能码，读取
var WK_WRITE=0x43;		//功能码，写
var PARA_CODE_SV=0x00;	//给定值
var dPt=10;				//约定小数点位置



/*阿里平台相关常量定义*/

var COMMAND_REPORT = 0x00; //属性上报。
var COMMAND_SET = 0x01; //属性设置。
var COMMAND_REPORT_REPLY = 0x02; //上报数据返回结果。
var COMMAND_SET_REPLY = 0x03; //属性设置设备返回结果。
var COMMAD_UNKOWN = 0xff;    //未知的命令。
var ALINK_PROP_REPORT_METHOD = 'thing.event.property.post'; //物联网平台Topic，设备上传属性数据到云端。
var ALINK_PROP_SET_METHOD = 'thing.service.property.set'; //物联网平台Topic，云端下发属性控制指令到设备端。
var ALINK_RAW_DOWN_METHOD ='thing.model.down_raw';          //自定义原数据下发到设备主题
var ALINK_PROP_SET_REPLY_METHOD = 'thing.service.property.set'; //物联网平台Topic，设备上报属性设置的结果到云端。
var SELF_DEFINE_TOPIC_UPDATE_FLAG = '/user/update'  //自定义Topic：/user/update。
var SELF_DEFINE_TOPIC_ERROR_FLAG = '/user/update/error' //自定义Topic：/user/update/error。
/*
示例数据：
设备上报属性数据：
传入参数：
    0x000000000100320100000000
输出结果：
    {"method":"thing.event.property.post","id":"1","params":{"prop_float":0,"prop_int16":50,"prop_bool":1},"version":"1.0"}

属性设置的返回结果：
传入参数：
    0x0300223344c8
输出结果：
    {"code":"200","data":{},"id":"2241348","version":"1.0"}
*/
function rawDataToProtocol(bytes) 
{						//传入参数为消息体，publish报文的头部和主题已经被处理，在此处报文要重新打包成AlinkJson报文上传到IOT平台
    
	/*
	var tempMessage = new Uint8Array(bytes.length);

    for (var i = 0; i < bytes.length; i++) 
	{
                 tempMessage[i] = bytes[i] & 0xff;			//8位无符号数赋值给整形变量时会以补码形式，所以需要先预处理
    }

	*/
    var uploadTempMessage = new Uint8Array(bytes.length);

    for (var i = 0; i < bytes.length; i++) 
	{
        uploadTempMessage[i] = bytes[i] & 0xff;			//8位无符号数赋值给整形变量时会以补码形式，所以需要先预处理
    }


    var uploadtempView=new DataView(uploadTempMessage.buffer,0);


    if(uploadtempView.getUint32(0)==0x70696e67)                                    //心跳包报文则不予处理
    {
        return (KeepAlive());
    }

    var msgOK=msgCheck(uploadTempMessage);           //进行CRC校验

    if(msgOK==true)
    {
        return messageUploadAnalysis(uploadTempMessage);         //处理报文
    }
    else
    {
       
        return(ErrorMessageUpload());      //  错误报文处理
    
    }
	





/*

    var dataView = new DataView(uint8Array.buffer, 0);		//dataview类 可以读取多种类型值,用来操作报文数据
    var jsonMap = new Object();				//object 对象
    var fHead = uint8Array[0];			// command，自定义方式的数据格式约定，此处为上报属性		
    if (fHead == COMMAND_REPORT) {		//属性上报
        jsonMap['method'] = ALINK_PROP_REPORT_METHOD;	//转换为ALink JSON格式，此处为上报到IOT平台的属性上报topic。数组编号内容为键，赋值内容为值
        jsonMap['version'] = '1.0';						//ALink JSON格式，协议版本号固定字段。
        jsonMap['id'] = '' + dataView.getInt32(1); //ALink JSON格式，标示该次请求id值。消息体的[1]到[4]字节
        var params = {};							//物模型的参数，这里要和物模型定义的参数匹配
        params['prop_int16'] = dataView.getInt16(5); //对应产品属性中prop_int16。
        params['prop_bool'] = uint8Array[7]; //对应产品属性中prop_bool。
        params['prop_float'] = dataView.getFloat32(8); //对应产品属性中prop_float。
        jsonMap['params'] = params; //ALink JSON格式，params标准字段。
    } else if(fHead == COMMAND_SET_REPLY) {
        jsonMap['version'] = '1.0'; //ALink JSON格式，协议版本号固定字段。
        jsonMap['id'] = '' + dataView.getInt32(1); //ALink JSON格式，标示该次请求id值。
        jsonMap['code'] = ''+ dataView.getUint8(5);
        jsonMap['data'] = {};
    }

    return jsonMap;

*/

}




/*温控设备上传报文*/
//参数，原始报文，通过校验得到的设备地址
//返回，JSON数据

function messageUploadAnalysis(UpMessage)
{
	
    var messageAnalysisTemp = new Uint8Array(UpMessage.length);

    for (var i = 0; i < UpMessage.length; i++) 
	{
        messageAnalysisTemp[i] = UpMessage[i] ;			//对数据进行修改时不能直接引用，会修改源数据
    }
    

	var messageAnalysisView = new DataView(messageAnalysisTemp.buffer, 0);		//dataview类 可以用多种类型值来读取报文数据，buffer属性访问只能读不能修改
    var jsonMap = new Object();				//object 对象
        //var opCodeValue = wkUpDataView.getUint16(0);			// 报文的操作码返回值
		
        
									//属性打包成JSON上报
    jsonMap['method'] = ALINK_PROP_REPORT_METHOD;	//转换为ALink JSON格式，此处为上报到IOT平台的属性上报topic。数组编号内容为键，赋值内容为值
    jsonMap['version'] = '1.0';						//ALink JSON格式，协议版本号固定字段。
    jsonMap['id'] = 'jpjpc' ;		  //ALink JSON格式，返回设备地址
    var params = new Object();							//也可以用params ={}  ;物模型的参数，这里要和物模型定义的参数匹配
   
  
    var temp=messageAnalysisView.getUint8(4);   //PLC低8位输入
    if ((temp&0x01)>0)            //燃烧机状态
    {
        params['PLCIO:ltrBurning']=1;
    } 
    else
    {
        params['PLCIO:ltrBurning']=0;

    }

    temp=messageAnalysisView.getUint8(6);   //PLC低8位输出
    if((temp&0x01)>0)   //轴流风机正转否
    {
        params['PLCIO:axialFanFwdRunning']=1;
    }
    else
    {
        params['PLCIO:axialFanFwdRunning']=0;
    }


    if((temp&0x02)>0)    //轴流风机反转否
    {
        params['PLCIO:axialFanRwdRunning']=1;
    }
    else
    {
        params['PLCIO:axialFanRwdRunning']=0;
    }


    if((temp&0x01)==0&&(temp&0x02)==0)   //轴流风机停转否
    {
        params['PLCIO:axialFanPause']=1;
    }
    else
    {
        params['PLCIO:axialFanPause']=0;
    }


    if((temp&0x04)>0)   //燃烧机电源切断
    {
        params['PLCIO:burningroomPowerCut']=1;
    }
    else
    {
        params['PLCIO:burningroomPowerCut']=0;
    }

    if((temp&0x08)>0)   //红绿灯显示
    {
        params['PLCIO:RGLight']=1;
    }
    else
    {
        params['PLCIO:RGLight']=0;
    }

    if((temp&0x10)>0)   //排湿风扇
    {
        params['PLCIO:dehumiFanRunning']=1;
    }
    else
    {
        params['PLCIO:dehumiFanRunning']=0;
    }
    


    var temp1=new Uint8Array(messageAnalysisTemp.buffer,7,8);				//温控表的数据是先低后高,所以干脆掉个头处理

    temp1.reverse(); 

    console.log(temp1);

    var tempView=new DataView(messageAnalysisTemp.buffer,7,8);

    console.log(tempView);
   
    

    params['yudianwk:wkHTALValue']=(tempView.getInt16(0))/dPt;          //上限报警温度
    params['yudianwk:wkStateByte']=tempView.getUint8(2);                 //报警状态字
    params['yudianwk:wkMVValue']=tempView.getInt8(3); 
    params['yudianwk:wkSV'] = (tempView.getInt16(4))/dPt;        //温控设备属性的设置值
    params['yudianwk:wkPV'] = (tempView.getInt16(6))/dPt;        //温控设备属性的过程值，即实际温度,注意小数点位置
    
    

    tempView=new DataView(messageAnalysisTemp.buffer,15,12);  //变频器1数据
    params['INVERTER1:ivt1SetFreq']=(tempView.getInt16(0))/100;
    params['INVERTER1:ivt1CurrentFreq']=(tempView.getInt16(2))/100;
    params['INVERTER1:ivt1BusVoltage']=(tempView.getInt16(4))/10;
    params['INVERTER1:ivt1OutputVoltage']=(tempView.getInt16(6))/10;
    params['INVERTER1:ivt1OutputCurrency']=(tempView.getInt16(8))/10;
    params['INVERTER1:ivt1OutputPower']=(tempView.getInt16(10))/10;

    tempView=new DataView(messageAnalysisTemp.buffer,27,12);  //变频器1数据
    params['INVERTER2:ivt2SetFreq']=(tempView.getInt16(0))/100;
    params['INVERTER2:ivt2CurrentFreq']=(tempView.getInt16(2))/100;
    params['INVERTER2:ivt2BusVoltage']=(tempView.getInt16(4))/10;
    params['INVERTER2:ivt2OutputVoltage']=(tempView.getInt16(6))/10;
    params['INVERTER2:ivt2OutputCurrency']=(tempView.getInt16(8))/10;
    params['INVERTER2:ivt2OutputPower']=(tempView.getInt16(10))/10;
    
    tempView=new DataView(messageAnalysisTemp.buffer,39,16); //温度采集
    params['BURNINGROOM:burningroomTemperature']=(tempView.getInt16(0))/10;
    params['DRYINGROOM:dryingroom4Temperature']=(tempView.getInt16(2))/10;
    params['DRYINGROOM:dryingroom5Temperature']=(tempView.getInt16(4))/10;
    params['DRYINGROOM:dryingroom6Temperature']=(tempView.getInt16(6))/10;


    tempView=new DataView(messageAnalysisTemp.buffer,55,3);  //轴流风机参数
    params['AXIALFAN:axialFanFwdMinutes']=tempView.getUint8(0);
    params['AXIALFAN:axialFanRwdMinutes']=tempView.getUint8(1);
    params['AXIALFAN:axialFanPauseMinutes']=tempView.getUint8(2);

    tempView=new DataView(messageAnalysisTemp.buffer,58,24);  //抽湿风机24个参数
    
    for (var i=0;i<24;i++)
    {
    
        params['DEHUMIFAN:dehumiFan'+i+'SegMinutes']=tempView.getUint8(i);

    }

    tempView=new DataView(messageAnalysisTemp.buffer,82,2);    //燃烧室温度上限
    params['BURNINGROOM:burningroomUpperLmt']=(tempView.getInt16(0))/10;

    tempView=new DataView(messageAnalysisTemp.buffer,84,7);   //PLC系统时间
                
    //var PLCSysTime= new Object;
    

    params['PLCSysTime:PLCYear']=tempView.getUint8(0);
    params['PLCSysTime:PLCMonth']=tempView.getUint8(1);
    params['PLCSysTime:PLCDay']=tempView.getUint8(2);
    params['PLCSysTime:PLCHour']=tempView.getUint8(3);
    params['PLCSysTime:PLCMinute']=tempView.getUint8(4);
    params['PLCSysTime:PLCSecond']=tempView.getUint8(5);
    params['PLCSysTime:PLCWeekday']=tempView.getUint8(6);

    //params['PLCSysTime']=PLCSysTime;


    jsonMap['params'] = params; //ALink JSON格式，params标准字段。 

	return jsonMap;
/*
			关于状态字和输出值先留空，待需要时再补上
*/

        

/*      修改相关的参数的返回报文

		else if(opCode==wkWrite) 
		{
        jsonMap['version'] = '1.0'; //ALink JSON格式，协议版本号固定字段。
        jsonMap['id'] = '' + dataView.getInt32(1); //ALink JSON格式，标示该次请求id值。
        jsonMap['code'] = ''+ dataView.getUint8(5);
        jsonMap['data'] = {};
        }
*/

}

 
/*
    else if(wkAddress==WK_DEVICES_SUM)       //调试用代码，调用设置属性，改设定温度SV
    {
        var jsonMapSetProp =new Object();

        jsonMapSetProp['method'] = ALINK_RAW_DOWN_METHOD;	//转换为ALink JSON格式，此处为上报到IOT平台的属性上报topic。数组编号内容为键，赋值内容为值
            jsonMapSetProp['version'] = '1.0';						//ALink JSON格式，协议版本号固定字段。
            jsonMapSetProp['id'] = ''+wkAddress ;		  //ALink JSON格式，返回设备地址
            var paramsSetProp = new Object();							//也可以用params ={}  ;物模型的参数，这里要和物模型定义的参数匹配
            

            

            paramsSetProp['SetTemperature'] = 171;        //温控设备属性的设置值
            paramsSetProp['CurrentTemperature'] = 0;        //温控设备属性的过程值，即实际温度,注意小数点位置
            paramsSetProp['HTALValue']=0;
            jsonMapSetProp['params'] = paramsSetProp; //ALink JSON格式，params标准字段。 

			return jsonMapSetProp;


    }
*/
   





/*传感器报文处理
参数：原始报文
返回：JSON数据
*/


function THSensorMessageUpload(THSensorMsg)
{
    var THSensorTempMessage = new Uint8Array(THSensorMsg.length);

    for (var i = 0; i < THSensorMsg.length; i++) 
	{
        THSensorTempMessage[i] = THSensorMsg[i] ;			//
    }
    

	var THSensorUpDataView = new DataView(THSensorTempMessage.buffer, 0);		//dataview类 可以用多种类型值来读取报文数据，buffer属性访问只能读不能修改
    var THjsonMap = new Object();				//object 对象
    //var opCodeValue = THSensorUpDataView.getUint16();			// 报文的操作码返回值
		
        
									//属性打包成JSON上报
    THjsonMap['method'] = ALINK_PROP_REPORT_METHOD;	//转换为ALink JSON格式，此处为上报到IOT平台的属性上报topic。数组编号内容为键，赋值内容为值
    THjsonMap['version'] = '1.0';						//ALink JSON格式，协议版本号固定字段。
    THjsonMap['id'] = ''+THSensorUpDataView.getUint8(0) ;		  //ALink JSON格式，返回设备地址
    var params = new Object();							//也可以用params ={}  ;物模型的参数，这里要和物模型定义的参数匹配
           
            
    params['Sensor'+THSensorUpDataView.getUint8(0) +'Temperature'] = (THSensorUpDataView.getInt16(3))/dPt;        //传感器温度
    params['Sensor'+THSensorUpDataView.getUint8(0)+'Humidity'] = (THSensorUpDataView.getInt16(5))/dPt;        //传感器湿度
            
    THjsonMap['params'] = params; //ALink JSON格式，params标准字段。 

	return THjsonMap;
}

/*错误报文处理
参数：无
返回：错误报文，在产品属性中增加一个报文错误信息的属性
*/

function ErrorMessageUpload()
{
   
        var jsonMapError=new Object();
        jsonMapError['method'] = ALINK_PROP_REPORT_METHOD;	//转换为ALink JSON格式，此处为上报到IOT平台的属性上报topic。数组编号内容为键，赋值内容为值
        jsonMapError['version'] = '1.0';						//ALink JSON格式，协议版本号固定字段。
        jsonMapError['id'] = 'Unknow message' ;		  //ALink JSON格式，返回设备地址
        var params = new Object;							//也可以用params ={}  ;物模型的参数，这里要和物模型定义的参数匹配
           
        params['ErrorTime'] = getCurrentTime();        //温控设备属性的设置值
        
        jsonMapError['params'] = params; //ALink JSON格式，params标准字段。 

		return jsonMapError;
    
}



function KeepAlive()
{                                       //心跳包ping 的16进制值为0x70696e67

   
        var jsonKeepAlive=new Object();
        jsonKeepAlive['method'] = ALINK_PROP_REPORT_METHOD;	//转换为ALink JSON格式，此处为上报到IOT平台的属性上报topic。数组编号内容为键，赋值内容为值
        jsonKeepAlive['version'] = '1.0';						//ALink JSON格式，协议版本号固定字段。
        jsonKeepAlive['id'] = 'ping' ;		  //ALink JSON格式，返回设备地址
        var params = new Object;							//也可以用params ={}  ;物模型的参数，这里要和物模型定义的参数匹配
        params={};

		return jsonKeepAlive;

}


/*温控上报报文数据校验
参数：需要校验的报文
返回：校验OK则返回设备地址，Checsum不正确或设备地址不正确，则返回0
*/



function msgCheck(checkTempMessage)
{

	var temp1=0xffff;
    var temp2=0xffff;
    var checkMsgViewData=new DataView(checkTempMessage.buffer,0);
    
    temp1=checkMsgViewData.getUint16(checkTempMessage.length-2);        //取出报文自带校验码
    temp2=GetCRC16(checkTempMessage);        //计算报文的CRC值

    if(temp1==temp2)
    {
        return true;
    }
    else
    {
        return false;
    }




}



/*
示例数据：
云端下发属性设置指令：即修改设备的相关数据
传入参数：
    {"method":"thing.service.property.set","id":"12345","version":"1.0","params":{"prop_float":123.452, "prop_int16":333, "prop_bool":1}}
输出结果：
    0x01 00003039 014d 01 42f6e76d

设备上报的返回结果：
传入数据：
    {"method":"thing.event.property.post","id":"12345","version":"1.0","code":200,"data":{}}
输出结果：
    0x0200003039c8
*/

/*暂时用作设定温度的属性设置
云端调试设备的属性修改时验证有效,为了避免算补码的繁琐，而且事实上设定温度也不会低于0度，所以在云端设置属性时最低为0
*/

function protocolToRawData(json) {
    var method = json['method'];
    var id = json['id'];
    var version = json['version'];
    var payloadArray = [];
    if (method == ALINK_PROP_SET_METHOD) //属性设置。
    {

        /*
        var params = json['params'];
        var SetTemperature=params['SetTemperature']*10;

        var tempChecksum=0;
        tempChecksum=tempChecksum+SetTemperature;
        tempChecksum=tempChecksum+0x43;
        tempChecksum=(tempChecksum+0x01)&0xffff;

        payloadArray = payloadArray.concat(buffer_uint16(tempChecksum)); //校验码
        payloadArray = payloadArray.concat(buffer_int16(SetTemperature)); //设定值
        payloadArray = payloadArray.concat(buffer_uint16(0x0043)); //参数，功能码
        payloadArray = payloadArray.concat(buffer_uint16(0x8181)); //双地址
      
        payloadArray.reverse();
        */















        /*
        var prop_float = params['prop_float'];
        var prop_int16 = params['prop_int16'];
        var prop_bool = params['prop_bool'];
        //按照自定义协议格式拼接 rawData。
        payloadArray = payloadArray.concat(buffer_uint8(COMMAND_SET)); //command字段。
        payloadArray = payloadArray.concat(buffer_int32(parseInt(id))); //ALink JSON格式 'id'。
        payloadArray = payloadArray.concat(buffer_int16(prop_int16)); //属性'prop_int16'的值。
        payloadArray = payloadArray.concat(buffer_uint8(prop_bool)); //属性'prop_bool'的值。
        payloadArray = payloadArray.concat(buffer_float32(prop_float)); //属性'prop_float'的值。
        */
    } else if (method ==  ALINK_PROP_REPORT_METHOD) { //设备上报数据返回结果。
        var code = json['code'];
        payloadArray = payloadArray.concat(buffer_uint8(COMMAND_REPORT_REPLY)); //command字段。
        payloadArray = payloadArray.concat(buffer_int32(parseInt(id))); //ALink JSON格式'id'。
        payloadArray = payloadArray.concat(buffer_uint8(code));
    } else { //未知命令，对于这些命令不做处理。
        var code = json['code'];
        payloadArray = payloadArray.concat(buffer_uint8(COMMAD_UNKOWN)); //command字段。
        payloadArray = payloadArray.concat(buffer_int32(parseInt(id))); //ALink JSON格式'id'。
        payloadArray = payloadArray.concat(buffer_uint8(code));
    }
    return payloadArray;
}

/*
  示例数据
  自定义Topic：
     /user/update，上报数据。
  输入参数：
     topic:/{productKey}/{deviceName}/user/update
     bytes: 0x000000000100320100000000
  输出参数：
  {
     "prop_float": 0,
     "prop_int16": 50,
     "prop_bool": 1,
     "topic": "/{productKey}/{deviceName}/user/update"
   }
 */
function transformPayload(topic, bytes) {
    var uint8Array = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
        uint8Array[i] = bytes[i] & 0xff;
    }
    var dataView = new DataView(uint8Array.buffer, 0);
    var jsonMap = {};

    if(topic.includes(SELF_DEFINE_TOPIC_ERROR_FLAG)) {
        jsonMap['topic'] = topic;
        jsonMap['errorCode'] = dataView.getInt8(0)
    } else if (topic.includes(SELF_DEFINE_TOPIC_UPDATE_FLAG)) {
        jsonMap['topic'] = topic;
        jsonMap['prop_int16'] = dataView.getInt16(5);
        jsonMap['prop_bool'] = uint8Array[7];
        jsonMap['prop_float'] = dataView.getFloat32(8);
    }

    return jsonMap;
}

//以下是部分辅助函数。
function buffer_uint8(value) {
    var uint8Array = new Uint8Array(1);
    var dv = new DataView(uint8Array.buffer, 0);
    dv.setUint8(0, value);
    return [].slice.call(uint8Array);
}
function buffer_uint16(value) {
    var uint8Array = new Uint8Array(2);
    var dv = new DataView(uint8Array.buffer, 0);
    dv.setUint16(0, value);
    return [].slice.call(uint8Array);
}
function buffer_int16(value) {
    var uint8Array = new Uint8Array(2);
    var dv = new DataView(uint8Array.buffer, 0);
    dv.setInt16(0, value);
    return [].slice.call(uint8Array);
}
function buffer_int32(value) {
    var uint8Array = new Uint8Array(4);
    var dv = new DataView(uint8Array.buffer, 0);
    dv.setInt32(0, value);
    return [].slice.call(uint8Array);
}
function buffer_float32(value) {
    var uint8Array = new Uint8Array(4);
    var dv = new DataView(uint8Array.buffer, 0);
    dv.setFloat32(0, value);
    return [].slice.call(uint8Array);
}



/*温湿度传感器CRC校验入口
参数：传感器报文
返回：校验是否正确
*/

function CheckTHSensorCRC(THSensorCRCMsg)
{
    var temp1=0xffff;
    var temp2=0xffff;
    var checkTHCRCViewData=new DataView(THSensorCRCMsg.buffer,0);
    
    temp1=checkTHCRCViewData.getUint16(THSensorCRCMsg.length-2);        //取出报文自带校验码
    temp2=GetCRC16(THSensorCRCMsg);

    if(temp1==temp2)
    {
        return true;
    }
    else
    {
        return false;
    }

}


/*获取当前时间
参数：无
返回：完整的当前时间
*/

function getCurrentTime() {
    var now = new Date();
    var year = now.getFullYear(); //得到年份
    var month = now.getMonth();//得到月份
    var date = now.getDate();//得到日期
    var day = now.getDay();//得到周几
    var hour = now.getHours();//得到小时
    var minu = now.getMinutes();//得到分钟
    var sec = now.getSeconds();//得到秒
    month = month + 1;
    if (month < 10) month = "0" + month;
    if (date < 10) date = "0" + date;
    if (hour < 10) hour = "0" + hour;
    if (minu < 10) minu = "0" + minu;
    if (sec < 10) sec = "0" + sec;
    var time = "";
    
      time = year + "-" + month + "-" + date+ " " + hour + ":" + minu + ":" + sec;
    
    return time;
  }




/*MODBUS 协议的CRC16校验
传入参数：需要处理的报文，高位在前，地位在后
返回：16位CRC
*/


function GetCRC16(CRCMsg)
{
    

    var tempCRCMsg= new Uint8Array(CRCMsg.length-2);        //去掉报文自带校验码
    for(i=0;i<CRCMsg.length;i++)
    {
        tempCRCMsg[i]=CRCMsg[i];
    }

    tempCRCMsgLength=CRCMsg.length-2;           //去掉校验码长度

    var TabH=new Uint8Array();
     TabH= [//CRC高位字节值表
        0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0,  
        0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,  
        0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0,  
        0x80, 0x41, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,  
        0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1,  
        0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,  
        0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1,  
        0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,  
        0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0,  
        0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40,  
        0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1,  
        0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,  
        0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0,  
        0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40,  
        0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0,  
        0x80, 0x41, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,  
        0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0,  
        0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,  
        0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0,  
        0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,  
        0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0,  
        0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40,  
        0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1,  
        0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,  
        0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0,  
        0x80, 0x41, 0x00, 0xC1, 0x81, 0x40  
     ];  
    var TabL= new Uint8Array()
        TabL= [//CRC低位字节值表
        0x00, 0xC0, 0xC1, 0x01, 0xC3, 0x03, 0x02, 0xC2, 0xC6, 0x06,  
        0x07, 0xC7, 0x05, 0xC5, 0xC4, 0x04, 0xCC, 0x0C, 0x0D, 0xCD,  
        0x0F, 0xCF, 0xCE, 0x0E, 0x0A, 0xCA, 0xCB, 0x0B, 0xC9, 0x09,  
        0x08, 0xC8, 0xD8, 0x18, 0x19, 0xD9, 0x1B, 0xDB, 0xDA, 0x1A,  
        0x1E, 0xDE, 0xDF, 0x1F, 0xDD, 0x1D, 0x1C, 0xDC, 0x14, 0xD4,  
        0xD5, 0x15, 0xD7, 0x17, 0x16, 0xD6, 0xD2, 0x12, 0x13, 0xD3,  
        0x11, 0xD1, 0xD0, 0x10, 0xF0, 0x30, 0x31, 0xF1, 0x33, 0xF3,  
        0xF2, 0x32, 0x36, 0xF6, 0xF7, 0x37, 0xF5, 0x35, 0x34, 0xF4,  
        0x3C, 0xFC, 0xFD, 0x3D, 0xFF, 0x3F, 0x3E, 0xFE, 0xFA, 0x3A,  
        0x3B, 0xFB, 0x39, 0xF9, 0xF8, 0x38, 0x28, 0xE8, 0xE9, 0x29,  
        0xEB, 0x2B, 0x2A, 0xEA, 0xEE, 0x2E, 0x2F, 0xEF, 0x2D, 0xED,  
        0xEC, 0x2C, 0xE4, 0x24, 0x25, 0xE5, 0x27, 0xE7, 0xE6, 0x26,  
        0x22, 0xE2, 0xE3, 0x23, 0xE1, 0x21, 0x20, 0xE0, 0xA0, 0x60,  
        0x61, 0xA1, 0x63, 0xA3, 0xA2, 0x62, 0x66, 0xA6, 0xA7, 0x67,  
        0xA5, 0x65, 0x64, 0xA4, 0x6C, 0xAC, 0xAD, 0x6D, 0xAF, 0x6F,  
        0x6E, 0xAE, 0xAA, 0x6A, 0x6B, 0xAB, 0x69, 0xA9, 0xA8, 0x68,  
        0x78, 0xB8, 0xB9, 0x79, 0xBB, 0x7B, 0x7A, 0xBA, 0xBE, 0x7E,  
        0x7F, 0xBF, 0x7D, 0xBD, 0xBC, 0x7C, 0xB4, 0x74, 0x75, 0xB5,  
        0x77, 0xB7, 0xB6, 0x76, 0x72, 0xB2, 0xB3, 0x73, 0xB1, 0x71,  
        0x70, 0xB0, 0x50, 0x90, 0x91, 0x51, 0x93, 0x53, 0x52, 0x92,  
        0x96, 0x56, 0x57, 0x97, 0x55, 0x95, 0x94, 0x54, 0x9C, 0x5C,  
        0x5D, 0x9D, 0x5F, 0x9F, 0x9E, 0x5E, 0x5A, 0x9A, 0x9B, 0x5B,  
        0x99, 0x59, 0x58, 0x98, 0x88, 0x48, 0x49, 0x89, 0x4B, 0x8B,  
        0x8A, 0x4A, 0x4E, 0x8E, 0x8F, 0x4F, 0x8D, 0x4D, 0x4C, 0x8C,  
        0x44, 0x84, 0x85, 0x45, 0x87, 0x47, 0x46, 0x86, 0x82, 0x42,  
        0x43, 0x83, 0x41, 0x81, 0x80, 0x40  
        ];
    var tempCRCMsgIndex=0
    var index=0;
    var crch = 0xFF;  //高CRC字节
    var crcl = 0xFF;  //低CRC字节

    while (tempCRCMsgIndex<tempCRCMsg.length)  //计算指定长度的CRC
    {
        index = crch ^ tempCRCMsg[tempCRCMsgIndex]&0xff;
        crch = crcl ^ TabH[ index]&0xff;
        crcl = TabL[ index]&0xff;
        tempCRCMsgIndex++;
    }
   
    return (((crch<<8) | crcl)&0xffff);  
}                           