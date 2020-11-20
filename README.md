# rtmp-to-webrtc

基于RTMP-CDN和WebRTC的低延迟(500ms以内)直播系统 




### 如何工作 

-  RTMP推流到CDN上, 需要进行编码参数和gop的参数调优 
-  边缘节点部署webrtc服务器
-  用户访问一路视频流的时候, 边缘节点webrtc服务器去CDN进行拉流
-  把rtmp流转封装为rtp, 喂给webrtc服务器



### RTMP推流脚本

推流部分使用ffmpeg
```
ffmpeg -f lavfi -re -i color=black:s=640x480:r=15 -filter:v "drawtext=text='%{localtime\:%T}':fontcolor=white:fontsize=80:x=20:y=20" \
-vcodec libx264 -tune zerolatency -preset ultrafast  -bsf:v h264_mp4toannexb  -g 15 -keyint_min 15 -profile:v baseline -level 3.0   \
-pix_fmt yuv420p -r 15 -f flv rtmp://39.106.248.166/live/live

```



### RTMP转封装RTP 

此部分使用了gstreamer,  只所以用gstreamer是因为发现ffmpeg的转出来的rtp包, 有一定概率webrtc会解析失败, 还未找到具体原因
```
gst-launch -v  rtmpsrc location=rtmp://localhost/live/{stream} ! flvdemux ! h264parse ! \
rtph264pay config-interval=-1 pt={pt} !  udpsink host=127.0.0.1 port={port}

```


### 一些数据

服务端部署在阿里云上,  延迟在1000毫秒内,  gstreamer的转封装引入了300ms-500ms延迟(目测, 还没验证).
优化后整体延迟可以在500ms以内.

在centos7上正常编译，nodejs 8.7    gcc++版本7
安装gstreamer  

yum install  libgstreamer*
yum install  gstreamer*

yum install gstreamer1
yum install gstreamer1-plugins-good
yum install gstreamer1-plugins-bad-freeworld 
yum install gstreamer1-libav-debuginfo 
yum install gstreamer1-plugins-bad-free-devel 
yum install gstreamer1-plugins-bad-freeworld-debuginfo  
yum install gstreamer1-plugins-base-tools 
yum install gstreamer1-plugins-ugly 
yum install gstreamer1-plugins-ugly-debuginfo
yum install gstreamer1-plugins-ugly-free-devel  
yum install gstreamer1-rtsp-server
yum install gstreamer1-rtsp-server-devel 
yum install gstreamer1-vaapi
yum install gstreamer1-vaapi-debuginfo 
yum install gstreamer1-libav



简历请砸向我:  jinyongxian@qq.com





