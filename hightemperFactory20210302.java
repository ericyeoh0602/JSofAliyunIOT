
/*�¿����豸������¿أ���ģ����ʱֻ����һ��PV,һ��SV,�����¶ȵ�������Ϊ+-100���϶�
���������ϱ��ı��ģ���ʽΪ      PV16+SV16+״̬+MV+У����16     
У����ȷ�����ȴӵ�ַ��ʼ����
��/д���ģ��¿��豸��ַ�趨Ϊ01H,��ַ��������ͬ�ֽڣ�ֵΪ01H+80H
������������ֵ���ģ�0X81 0X81 0X52 0 0 0 0X53
������  52H Ϊ��ָ��  43HΪдָ��
��������  00H Ϊ����ֵ 
���ݽ���  �Ͱ�λ+�߰�λ

*/









/*���ݽ������������Ϣ�岿�֣���Ϊ��Ϣ����DTU����MQTT����ؽṹ��������������������ȫû�иı䣬�����
�豸�Ĳ�ͬ���ģ���ȫ����������ȷ�Ľ����������������ݴ�����ϱ���IOTƽ̨���豸��أ���������豸һ������ֻ����һ������
��ô�����ݽ������ǲ���ֻ�ܵ����ϴ���?*/


//�޸���2021/2/25 10��00


/*ȫ�ֶ���*/



var WK_DEVICES_SUM=0X05;     //�ݶ���������5̨�¿��豸���¿��豸��ַ��01��05
var TH_SENSORS_SUM=0X05;       //�ݶ�������5̨��ʪ�ȴ���������������ַ��06��0A

var WK_DEVICES_ADDRESS_1=0X01; //�¿��豸1#

/*����¿س�������*/

var WK_READ=0x52;		//�����룬��ȡ
var WK_WRITE=0x43;		//�����룬д
var PARA_CODE_SV=0x00;	//����ֵ
var dPt=10;				//Լ��С����λ��



/*����ƽ̨��س�������*/

var COMMAND_REPORT = 0x00; //�����ϱ���
var COMMAND_SET = 0x01; //�������á�
var COMMAND_REPORT_REPLY = 0x02; //�ϱ����ݷ��ؽ����
var COMMAND_SET_REPLY = 0x03; //���������豸���ؽ����
var COMMAD_UNKOWN = 0xff;    //δ֪�����
var ALINK_PROP_REPORT_METHOD = 'thing.event.property.post'; //������ƽ̨Topic���豸�ϴ��������ݵ��ƶˡ�
var ALINK_PROP_SET_METHOD = 'thing.service.property.set'; //������ƽ̨Topic���ƶ��·����Կ���ָ��豸�ˡ�
var ALINK_RAW_DOWN_METHOD ='thing.model.down_raw';          //�Զ���ԭ�����·����豸����
var ALINK_PROP_SET_REPLY_METHOD = 'thing.service.property.set'; //������ƽ̨Topic���豸�ϱ��������õĽ�����ƶˡ�
var SELF_DEFINE_TOPIC_UPDATE_FLAG = '/user/update'  //�Զ���Topic��/user/update��
var SELF_DEFINE_TOPIC_ERROR_FLAG = '/user/update/error' //�Զ���Topic��/user/update/error��
/*
ʾ�����ݣ�
�豸�ϱ��������ݣ�
���������
    0x000000000100320100000000
��������
    {"method":"thing.event.property.post","id":"1","params":{"prop_float":0,"prop_int16":50,"prop_bool":1},"version":"1.0"}

�������õķ��ؽ����
���������
    0x0300223344c8
��������
    {"code":"200","data":{},"id":"2241348","version":"1.0"}
*/
function rawDataToProtocol(bytes) 
{						//�������Ϊ��Ϣ�壬publish���ĵ�ͷ���������Ѿ��������ڴ˴�����Ҫ���´����AlinkJson�����ϴ���IOTƽ̨
    
	/*
	var tempMessage = new Uint8Array(bytes.length);

    for (var i = 0; i < bytes.length; i++) 
	{
                 tempMessage[i] = bytes[i] & 0xff;			//8λ�޷�������ֵ�����α���ʱ���Բ�����ʽ��������Ҫ��Ԥ����
    }

	*/
    var uploadTempMessage = new Uint8Array(bytes.length);

    for (var i = 0; i < bytes.length; i++) 
	{
        uploadTempMessage[i] = bytes[i] & 0xff;			//8λ�޷�������ֵ�����α���ʱ���Բ�����ʽ��������Ҫ��Ԥ����
    }


    var uploadTempView=new DataView(uploadTempMessage.buffer,0);


    if(uploadTempView.getUint32(0)==0x70696e67)                                    //�������������账��
    {
        return (KeepAlive());
    }

    var wkAddress=wkChecksum(uploadTempMessage);           //����У������֤,��֤�¿ر��Ļ��Ǵ��������Ĳ������豸��ַ

    if(wkAddress!=0)
    {
        return wkMessageUpload(uploadTempMessage,wkAddress);         //�����¿ر���
    }
    else
    {
        if(CheckTHSensorCRC(uploadTempMessage))
        {
            return(THSensorMessageUpload(uploadTempMessage));   //������������
        }
        else
        {
            return(ErrorMessageUpload());      //  �����Ĵ���
        }
    }
	





/*

    var dataView = new DataView(uint8Array.buffer, 0);		//dataview�� ���Զ�ȡ��������ֵ,����������������
    var jsonMap = new Object();				//object ����
    var fHead = uint8Array[0];			// command���Զ��巽ʽ�����ݸ�ʽԼ�����˴�Ϊ�ϱ�����		
    if (fHead == COMMAND_REPORT) {		//�����ϱ�
        jsonMap['method'] = ALINK_PROP_REPORT_METHOD;	//ת��ΪALink JSON��ʽ���˴�Ϊ�ϱ���IOTƽ̨�������ϱ�topic������������Ϊ������ֵ����Ϊֵ
        jsonMap['version'] = '1.0';						//ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
        jsonMap['id'] = '' + dataView.getInt32(1); //ALink JSON��ʽ����ʾ�ô�����idֵ����Ϣ���[1]��[4]�ֽ�
        var params = {};							//��ģ�͵Ĳ���������Ҫ����ģ�Ͷ���Ĳ���ƥ��
        params['prop_int16'] = dataView.getInt16(5); //��Ӧ��Ʒ������prop_int16��
        params['prop_bool'] = uint8Array[7]; //��Ӧ��Ʒ������prop_bool��
        params['prop_float'] = dataView.getFloat32(8); //��Ӧ��Ʒ������prop_float��
        jsonMap['params'] = params; //ALink JSON��ʽ��params��׼�ֶΡ�
    } else if(fHead == COMMAND_SET_REPLY) {
        jsonMap['version'] = '1.0'; //ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
        jsonMap['id'] = '' + dataView.getInt32(1); //ALink JSON��ʽ����ʾ�ô�����idֵ��
        jsonMap['code'] = ''+ dataView.getUint8(5);
        jsonMap['data'] = {};
    }

    return jsonMap;

*/

}




/*�¿��豸�ϴ�����*/
//������ԭʼ���ģ�ͨ��У��õ����豸��ַ
//���أ�JSON����

function wkMessageUpload(wkUpMessage,wkUpAddress)
{
	
    var wkUploadTempMessage = new Uint8Array(wkUpMessage.length);

    for (var i = 0; i < wkUpMessage.length; i++) 
	{
        wkUploadTempMessage[i] = wkUpMessage[i] ;			//
    }
    

	var wkUpDataView = new DataView(wkUploadTempMessage.buffer, 0);		//dataview�� �����ö�������ֵ����ȡ�������ݣ�buffer���Է���ֻ�ܶ������޸�
    var jsonMap = new Object();				//object ����
        //var opCodeValue = wkUpDataView.getUint16(0);			// ���ĵĲ����뷵��ֵ
		
        
									//���Դ����JSON�ϱ�
    jsonMap['method'] = ALINK_PROP_REPORT_METHOD;	//ת��ΪALink JSON��ʽ���˴�Ϊ�ϱ���IOTƽ̨�������ϱ�topic������������Ϊ������ֵ����Ϊֵ
    jsonMap['version'] = '1.0';						//ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
    jsonMap['id'] = ''+wkUpAddress ;		  //ALink JSON��ʽ�������豸��ַ
    var params = new Object();							//Ҳ������params ={}  ;��ģ�͵Ĳ���������Ҫ����ģ�Ͷ���Ĳ���ƥ��
    var temp=new Uint8Array(wkUploadTempMessage.buffer,0,wkUploadTempMessage.length-2);				//��У�����⣬���ݵ�ͷ���˴�wkUploadTempMessage.buffer���ݻᱻ�޸�

    temp.reverse();                         //�����ݱ��ĵ�ͷ���ٴӺ��濪ʼȡ���ݣ���ʵ�ָ�λ��ǰ����λ�ں������
			
    var wkUploadtempDataView=new DataView(temp.buffer);

    params['SetTemperature'] = (wkUploadtempDataView.getInt16(4))/dPt;        //�¿��豸���Ե�����ֵ
    params['CurrentTemperature'] = (wkUploadtempDataView.getInt16(6))/dPt;        //�¿��豸���ԵĹ���ֵ����ʵ���¶�,ע��С����λ��
    params['HTALValue']=(wkUploadtempDataView.getInt16(0))/dPt;
    jsonMap['params'] = params; //ALink JSON��ʽ��params��׼�ֶΡ� 

	return jsonMap;
/*
			����״̬�ֺ����ֵ�����գ�����Ҫʱ�ٲ���
*/

        

/*      �޸���صĲ����ķ��ر���

		else if(opCode==wkWrite) 
		{
        jsonMap['version'] = '1.0'; //ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
        jsonMap['id'] = '' + dataView.getInt32(1); //ALink JSON��ʽ����ʾ�ô�����idֵ��
        jsonMap['code'] = ''+ dataView.getUint8(5);
        jsonMap['data'] = {};
        }
*/

}

 
/*
    else if(wkAddress==WK_DEVICES_SUM)       //�����ô��룬�����������ԣ����趨�¶�SV
    {
        var jsonMapSetProp =new Object();

        jsonMapSetProp['method'] = ALINK_RAW_DOWN_METHOD;	//ת��ΪALink JSON��ʽ���˴�Ϊ�ϱ���IOTƽ̨�������ϱ�topic������������Ϊ������ֵ����Ϊֵ
            jsonMapSetProp['version'] = '1.0';						//ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
            jsonMapSetProp['id'] = ''+wkAddress ;		  //ALink JSON��ʽ�������豸��ַ
            var paramsSetProp = new Object();							//Ҳ������params ={}  ;��ģ�͵Ĳ���������Ҫ����ģ�Ͷ���Ĳ���ƥ��
            

            

            paramsSetProp['SetTemperature'] = 171;        //�¿��豸���Ե�����ֵ
            paramsSetProp['CurrentTemperature'] = 0;        //�¿��豸���ԵĹ���ֵ����ʵ���¶�,ע��С����λ��
            paramsSetProp['HTALValue']=0;
            jsonMapSetProp['params'] = paramsSetProp; //ALink JSON��ʽ��params��׼�ֶΡ� 

			return jsonMapSetProp;


    }
*/
   





/*���������Ĵ���
������ԭʼ����
���أ�JSON����
*/


function THSensorMessageUpload(THSensorMsg)
{
    var THSensorTempMessage = new Uint8Array(THSensorMsg.length);

    for (var i = 0; i < THSensorMsg.length; i++) 
	{
        THSensorTempMessage[i] = THSensorMsg[i] ;			//
    }
    

	var THSensorUpDataView = new DataView(THSensorTempMessage.buffer, 0);		//dataview�� �����ö�������ֵ����ȡ�������ݣ�buffer���Է���ֻ�ܶ������޸�
    var THjsonMap = new Object();				//object ����
    //var opCodeValue = THSensorUpDataView.getUint16();			// ���ĵĲ����뷵��ֵ
		
        
									//���Դ����JSON�ϱ�
    THjsonMap['method'] = ALINK_PROP_REPORT_METHOD;	//ת��ΪALink JSON��ʽ���˴�Ϊ�ϱ���IOTƽ̨�������ϱ�topic������������Ϊ������ֵ����Ϊֵ
    THjsonMap['version'] = '1.0';						//ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
    THjsonMap['id'] = ''+THSensorUpDataView.getUint8(0) ;		  //ALink JSON��ʽ�������豸��ַ
    var params = new Object();							//Ҳ������params ={}  ;��ģ�͵Ĳ���������Ҫ����ģ�Ͷ���Ĳ���ƥ��
           
            
    params['Sensor'+THSensorUpDataView.getUint8(0) +'Temperature'] = (THSensorUpDataView.getInt16(3))/dPt;        //�������¶�
    params['Sensor'+THSensorUpDataView.getUint8(0)+'Humidity'] = (THSensorUpDataView.getInt16(5))/dPt;        //������ʪ��
            
    THjsonMap['params'] = params; //ALink JSON��ʽ��params��׼�ֶΡ� 

	return THjsonMap;
}

/*�����Ĵ���
��������
���أ������ģ��ڲ�Ʒ����������һ�����Ĵ�����Ϣ������
*/

function ErrorMessageUpload()
{
   
        var jsonMapError=new Object();
        jsonMapError['method'] = ALINK_PROP_REPORT_METHOD;	//ת��ΪALink JSON��ʽ���˴�Ϊ�ϱ���IOTƽ̨�������ϱ�topic������������Ϊ������ֵ����Ϊֵ
        jsonMapError['version'] = '1.0';						//ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
        jsonMapError['id'] = 'Unknow message' ;		  //ALink JSON��ʽ�������豸��ַ
        var params = new Object;							//Ҳ������params ={}  ;��ģ�͵Ĳ���������Ҫ����ģ�Ͷ���Ĳ���ƥ��
           
        params['ErrorTime'] = getCurrentTime();        //�¿��豸���Ե�����ֵ
        
        jsonMapError['params'] = params; //ALink JSON��ʽ��params��׼�ֶΡ� 

		return jsonMapError;
    
}



function KeepAlive()
{                                       //������ping ��16����ֵΪ0x70696e67

   
        var jsonKeepAlive=new Object();
        jsonKeepAlive['method'] = ALINK_PROP_REPORT_METHOD;	//ת��ΪALink JSON��ʽ���˴�Ϊ�ϱ���IOTƽ̨�������ϱ�topic������������Ϊ������ֵ����Ϊֵ
        jsonKeepAlive['version'] = '1.0';						//ALink JSON��ʽ��Э��汾�Ź̶��ֶΡ�
        jsonKeepAlive['id'] = 'ping' ;		  //ALink JSON��ʽ�������豸��ַ
        var params = new Object;							//Ҳ������params ={}  ;��ģ�͵Ĳ���������Ҫ����ģ�Ͷ���Ĳ���ƥ��
        params={};

		return jsonKeepAlive;

}


/*�¿��ϱ���������У��
��������ҪУ��ı���
���أ�У��OK�򷵻��豸��ַ��Checsum����ȷ���豸��ַ����ȷ���򷵻�0
*/



function wkChecksum(checkTempMessage)
{

	
    if(checkTempMessage.length%2!=0)           //�¿��ǵ�������ż��λ��ż��λ���ݲ������dataview offset���
    {
        return 0;                       //��ż��λһ�������¿���
    }

    var reverseMessage=new Uint8Array(checkTempMessage.length);
	var temp1=0x0000;
	var	temp2=0x0000;


    for(var i=0;i<checkTempMessage.length;i++)
    {
        reverseMessage[i]=checkTempMessage[i];                   //�������Ͷ���ָ��ͬһ���ѣ�������Ҫ���������ٴ���
    }

    reverseMessage.reverse();                       //���ĵ�ͷ
    var CheckSumDataView=new DataView(reverseMessage.buffer);

	var temp1=CheckSumDataView.getUint16(0);			//�����Դ���У����
	



	for(var i=2;i<reverseMessage.length;i++)            //����У��ֵ
	{
		temp2=temp2+CheckSumDataView.getUint16(i);
        i++;
	}

    temp2=temp2&0xffff;                             //У��ͳ�0XFFFF�����js���Զ�����Ϊ32λ���ݣ�����Ҫ�Ѹ�λ����ȥ��

    for(var i=1;i<WK_DEVICES_SUM+1;i++)           //������У��ֵ+��ַ����֤�¿��豸��ַ����ֵַһ������0
    {
        if((temp2+i)==temp1)
        {
            return i;                           //�����豸��ַ
        }
    }


	return 0;                           //�豸��ַ���Ի���ͨѶ���ݳ���



}



/*
ʾ�����ݣ�
�ƶ��·���������ָ����޸��豸���������
���������
    {"method":"thing.service.property.set","id":"12345","version":"1.0","params":{"prop_float":123.452, "prop_int16":333, "prop_bool":1}}
��������
    0x01 00003039 014d 01 42f6e76d

�豸�ϱ��ķ��ؽ����
�������ݣ�
    {"method":"thing.event.property.post","id":"12345","version":"1.0","code":200,"data":{}}
��������
    0x0200003039c8
*/

/*��ʱ�����趨�¶ȵ���������
�ƶ˵����豸�������޸�ʱ��֤��Ч,Ϊ�˱����㲹��ķ�����������ʵ���趨�¶�Ҳ�������0�ȣ��������ƶ���������ʱ���Ϊ0
*/

function protocolToRawData(json) {
    var method = json['method'];
    var id = json['id'];
    var version = json['version'];
    var payloadArray = [];
    if (method == ALINK_PROP_SET_METHOD) //�������á�
    {
        var params = json['params'];
        var SetTemperature=params['SetTemperature']*10;

        var tempChecksum=0;
        tempChecksum=tempChecksum+SetTemperature;
        tempChecksum=tempChecksum+0x43;
        tempChecksum=(tempChecksum+0x01)&0xffff;

        payloadArray = payloadArray.concat(buffer_uint16(tempChecksum)); //У����
        payloadArray = payloadArray.concat(buffer_int16(SetTemperature)); //�趨ֵ
        payloadArray = payloadArray.concat(buffer_uint16(0x0043)); //������������
        payloadArray = payloadArray.concat(buffer_uint16(0x8181)); //˫��ַ
      
        payloadArray.reverse();




        /*
        var prop_float = params['prop_float'];
        var prop_int16 = params['prop_int16'];
        var prop_bool = params['prop_bool'];
        //�����Զ���Э���ʽƴ�� rawData��
        payloadArray = payloadArray.concat(buffer_uint8(COMMAND_SET)); //command�ֶΡ�
        payloadArray = payloadArray.concat(buffer_int32(parseInt(id))); //ALink JSON��ʽ 'id'��
        payloadArray = payloadArray.concat(buffer_int16(prop_int16)); //����'prop_int16'��ֵ��
        payloadArray = payloadArray.concat(buffer_uint8(prop_bool)); //����'prop_bool'��ֵ��
        payloadArray = payloadArray.concat(buffer_float32(prop_float)); //����'prop_float'��ֵ��
        */
    } else if (method ==  ALINK_PROP_REPORT_METHOD) { //�豸�ϱ����ݷ��ؽ����
        var code = json['code'];
        payloadArray = payloadArray.concat(buffer_uint8(COMMAND_REPORT_REPLY)); //command�ֶΡ�
        payloadArray = payloadArray.concat(buffer_int32(parseInt(id))); //ALink JSON��ʽ'id'��
        payloadArray = payloadArray.concat(buffer_uint8(code));
    } else { //δ֪���������Щ���������
        var code = json['code'];
        payloadArray = payloadArray.concat(buffer_uint8(COMMAD_UNKOWN)); //command�ֶΡ�
        payloadArray = payloadArray.concat(buffer_int32(parseInt(id))); //ALink JSON��ʽ'id'��
        payloadArray = payloadArray.concat(buffer_uint8(code));
    }
    return payloadArray;
}

/*
  ʾ������
  �Զ���Topic��
     /user/update���ϱ����ݡ�
  ���������
     topic:/{productKey}/{deviceName}/user/update
     bytes: 0x000000000100320100000000
  ���������
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

//�����ǲ��ָ���������
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



/*��ʪ�ȴ�����CRCУ�����
����������������
���أ�У���Ƿ���ȷ
*/

function CheckTHSensorCRC(THSensorCRCMsg)
{
    var temp1=0xffff;
    var temp2=0xffff;
    var checkTHCRCViewData=new DataView(THSensorCRCMsg.buffer,0);
    
    temp1=checkTHCRCViewData.getUint16(THSensorCRCMsg.length-2);        //ȡ�������Դ�У����
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


/*��ȡ��ǰʱ��
��������
���أ������ĵ�ǰʱ��
*/

function getCurrentTime() {
    var now = new Date();
    var year = now.getFullYear(); //�õ����
    var month = now.getMonth();//�õ��·�
    var date = now.getDate();//�õ�����
    var day = now.getDay();//�õ��ܼ�
    var hour = now.getHours();//�õ�Сʱ
    var minu = now.getMinutes();//�õ�����
    var sec = now.getSeconds();//�õ���
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




/*MODBUS Э���CRC16У��
�����������Ҫ����ı��ģ���λ��ǰ����λ�ں�
���أ�16λCRC
*/


function GetCRC16(CRCMsg)
{
    

    var tempCRCMsg= new Uint8Array(CRCMsg.length-2);        //ȥ�������Դ�У����
    for(i=0;i<CRCMsg.length;i++)
    {
        tempCRCMsg[i]=CRCMsg[i];
    }

    tempCRCMsgLength=CRCMsg.length-2;           //ȥ��У���볤��

    var TabH=new Uint8Array();
     TabH= [//CRC��λ�ֽ�ֵ��
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
        TabL= [//CRC��λ�ֽ�ֵ��
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
    var crch = 0xFF;  //��CRC�ֽ�
    var crcl = 0xFF;  //��CRC�ֽ�

    while (tempCRCMsgIndex<tempCRCMsg.length)  //����ָ�����ȵ�CRC
    {
        index = crch ^ tempCRCMsg[tempCRCMsgIndex]&0xff;
        crch = crcl ^ TabH[ index]&0xff;
        crcl = TabL[ index]&0xff;
        tempCRCMsgIndex++;
    }
   
    return (((crch<<8) | crcl)&0xffff);  
}                           

