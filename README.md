# aqmthai.js

a non-official aqmthai.com's public report to influxdb importer.

```
$ aqmthai -h
Usage: aqmthai [options]

Options:
  -V, --version     output the version number
  -b, --background  run aqmthai in non-interactive mode
  -h, --help        output usage information 
```

```
                       .-. .-.           _       _
                      .' `.: :          :_;     :_;
 .--.   .---.,-.,-.,-.`. .': `-.  .--.  .-.     .-. .--.
' .; ; ' .; :: ,. ,. : : : : .. :' .; ; : : _   : :`._-.'
`.__,_;`._. ;:_;:_;:_; :_; :_;:_;`.__,_;:_;:_;  : :`.__.'
          : :                                 .-. :
          :_:                                 `._.'
v1.0.16
? Enter your InfluxDB host: localhost
? Enter your InfluxDB port: 8086
? Enter your InfluxDB database name: mydb
? Enter your InfluxDB username: admin
? Enter your InfluxDB password: *****
? Enter your InfluxDB measurement: aqm
? Insertion delay in ms. 2
? Enter the start-year: 2019
? Enter the end-year: 2019
? Select aqmthai.com's station. (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◉ 03t ริมถนนกาญจนาภิเษก เขตบางขุนเทียน กรุงเทพ
 ◉ 05t แขวงบางนา เขตบางนา กรุงเทพ
 ◯ 08t ต.ทรงคนอง อ.พระประแดง จ.สมุทรปราการ
 ◯ 10t แขวงคลองจั่น เขตบางกะปิ กรุงเทพ
 ◯ 13t ต.บางกรวย อ.บางกรวย จ.นนทบุรี
 ◯ 17t ต.ตลาด อ.พระประแดง จ.สมุทรปราการ
 ◯ 19t ต.บางเสาธง อ.บางเสาธง จ.สมุทรปราการ
 ◯ 21t ต.ประตูชัย อ.พระนครศรีอยุธยา จ.พระนครศรีอยุธยา
 ◯ 24t ต.หน้าพระลาน อ.เฉลิมพระเกียรติ จ.สระบุรี
 ◯ 25t ต.ปากเพรียว อ.เมือง จ.สระบุรี
```
