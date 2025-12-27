import time, urllib.request
while True:
  try:
    urllib.request.urlopen("http://elasticsearch:9200")
    break
  except:
    print("Waiting for ES...")
    time.sleep(5)
