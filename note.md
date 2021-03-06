** 基于RTMP和WebRTC开发大规模低延迟(1000毫秒内)直播系统


**** 问题

随着移动设备大规模的普及以及流量的资费越来越便宜, 超低延迟的场景越来越多. 从去年到今年火过的场景就有在线娃娃机, 直播答题, 在线K歌等. 但要做到音视频的超低延迟确是很不容易, 编码延迟, 网络丢包, 网络抖动, 多节点relay,视频分段传输,播放端缓存等等都会带来延迟. 


**** WebRTC兴起提供的方案以及遇到的问题

WebRTC技术的兴起为低延迟音视频传输带来了解决方案, 但WebRTC是为端到端设计的, 适合的场景是小规模内的实时互动, 例如视频会议, 连麦场景. 即使加入了SFU Media server作为转发服务器, 也很难做到大规模的分发.  另外一个需要考量的是流量成本, WebRTC的实时流量是通过UDP传输的(某些情况下可以用TCP), 无法复用在传统CDN的架构之上, 实时的流量价格更是CDN流量的3倍以上, 部署一个超低延迟的直播网络成本非常高. 


**** RTMP系统推流播放延迟分析

一个经过优化的RTMP-CDN网络端到端的延迟大概在1-3秒, 延迟大一些要在5秒甚至10秒以上. 从推流到播放, 会引入延迟的环节有编码延迟, 网络丢包和网络抖动, 视频的分段传输, 多媒体节点的relay, 播放器的缓存等等.  实际上除了网络丢包和网络抖动不太可控之外, 其他的各各环节都有一定的优化方案, 比如使用x264的-preset ultrafast和zerolatency, 可以降低编码的延迟,
分段传输部分可以把GOP减少到1秒之内, 在播放器端可以适当减小buffer, 并设置一定的追帧策略, 防止过大的buffer引起的时延. 


**** 低成本的低延迟的实现 


在RTMP直播系统中从推流端到网络传输到播放器都做深度定制确实可以做到比较低的延迟, 但成本也是比较高的, 需要完备的高水平的团队(服务端和客户端), 以及大量的带宽服务器资源. 如果想做到超低延迟(1000毫秒以内)更是难上加难, 而且这么低的延迟也会带来一些负面的效果, 网络出现少许抖动的时候就会出现卡顿等等. 有没有更低成本的实现方案呢? 以及如何复用现有的CDN的基础设施来做到低延迟?  其实我们可以在现有的RTMP-CDN系统上做一些优化调整, 在边缘节点把RTMP流转化为WebRTC可以播放的流来达到低延迟和CDN系统的复用, 同时还可以利用WebRTC抗丢包来优化最后一公里的观看体验. WebRTC在各个平台上都有相应的SDK, 尤其是在浏览器内嵌, 可以极大的减少整个系统的开发, 升级, 维护成本, 达到打开浏览器就可以观看的效果.  


**** 需要注意的问题 

当然事情不可能那么完美, The world is a bug. 让RTMP和WebRTC可以很好的互通也需要做一些额外的工作:


1, RTMP推流端低延迟以及GOP大小 

如果想做到低延迟, 我们需要在推流端尽可能的快, 同时RTMP-CDN一般都会有GOP cache, 会缓存最近的一个GOP, GOP太大是没法做到低延迟的, 可以考虑把GOP设置在1秒. 这样的好处还有一个就是在WebRTC播放端, 如果出现丢关键帧的情况可以快速回复. 在我们这个场景下WebRTC服务端会拒绝WebRTR的FIR信息, 通过下一个关键帧来解决关键帧丢失的问题.


2, RTMP源站以及边缘站尽可能的不做任何缓存

在一个帧率为25FPS的直播流中, 缓存一帧就会增加40ms的延迟. 在我们这个场景下RTMP的源站和边缘站除了做一些GOP cache外, 其他缓存要尽可能的小.


3, 编码器参数设置 

WebRTC对H264的支持还没有那么完美, 比如在chrome支持H264的baseline, main profile 以及high profile, firefox和safari目前支持baseline. 
B帧的存在虽然可以降低一些带宽占用确会引入更多的延迟, 不推荐使用.  经过测试H264的编码参数选择可以选择为baseline level3.

4, PPS和SPS

在RTMP场景中通常我们只会在推流开始的时候加入PPS和SPS, 但WebRTC要求在每个关键帧前面都有PPS和SPS, 这个问题我们可以在推流的时候解决, 也可以在把RTMP转成RTP的时候加入.  万能的ffmpeg已经支持这个bitstream filter -- dump_extra, 谢谢ffmpeg让音视频开发者节省了那么多的时间.


5, 音频转码

RTMP的协议规范中音频支持pcma和pcmu, WebRTC也支持pcma和pcmu, 如果RTMP推流端推送的音视是pcma或者pcmu格式, 我们就不用转码了. 当然现实比较残酷, 在RTMP体系中大多数厂商和开源项目只支持AAC, 这个时候我们需要对音频做转码. 这样的工作对于万能的ffmpeg来说也只有一二十行代码的事情,  再一次谢谢ffmpeg让音视频开发者节省了那么多的时间.(看到ffmpeg的强大了吧, 如果想学ffmpeg 请购买大师兄的书<<FFmpeg从入门到精通>>)

6, 视频转封装 

视频部分我们上边提到尽可能的用H264 baseline,  这样的话WebRTC支持也会比较好. 我们只需要把RTMP流转封装为RTP的流, 喂给相应的WebRTC mediaserver.
这部分可以借助FFmpeg来完成. 


**** 如何落地

目前身边完全没有完全匹配的需求, 这个方案目前并没有落地, 设想中的落地方式是, RTMP部分还是用现有的CDN, 自己部署WebRTC的边缘节点, 根据访问请求向CDN拉流.
需要开发的地方只有边缘节点WebRTC media server部分, 这部分我们可以借助一些开源的media server然后再做一些业务上的开发. 支持rtp输入的开源WebRTC mediaserver 有janus-gateway,  medooze mediaserver.  


Talk is cheap, show me the code.  我实现了一个RTMP推流WebRTC播放的原型实现, 在阿里云上测试延迟在500ms以内. 



****  最后

最后的最后, 当然是广告环节. 
我已经加入学而思网校, 负责互动直播产品的研发. 
目前音视频方向都还有很多坑, 客户端和服务端都比较缺人, 如果对音视频和WebRTC以及在线教育感兴趣欢迎联系我. 


再原有基础，加上音频。
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





