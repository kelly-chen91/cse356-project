# cse356-project

A video server implemented for infinite scrolls. :sunglasses:

## Upon starting a server fresh

Run the following to set up and download all dependencies.

```
./setup.sh
```

## Start the service

```
docker-compose up -d --build
```

**For monitoring server backend**

```
docker logs node -f
```

## Start processing videos

0. Go to the scripts directory.
   ```
   cd scripts
   ```
1. Get the videos from grading server.
   ```
   ./getVids.sh
   ```
2. Pad the videos
   ```
   ./pad_video.sh
   ```
3. Generate thumbnails for videos.
   ```
   ./gen-thumbnail.sh
   ```
4. Process the padded videos into streamable chunks. (**Warning:** this process takes a significant long time.)
   ```
   ./manifest.sh
   ```

## Populate Initial Videos

To populate the database with JSON data, first cd back to `cse356-project/scripts` and then do `node populateDB.js`

You can change the json file you want to populate in `.env` file.
