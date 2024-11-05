# cse356-project

A video server implemented for infinite scrolls. :sunglasses:

## Upon starting a server fresh

Run the following to set up and download all dependencies.

```
./setup.sh
```

## Start the service

```
docker-compose up -d
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

## Gorse (Recommendation System)

After performing `docker-compose up -d`, you can access to Gorse dashboard via `localhost:8088`.

Please view [this documentation](https://gorse.io/docs/master/quick-start.html) to see the available API endpoints to implement collaborative filtering

Note: From Zhen: remember to check out zhenghaoz (the goat)'s wechat :wink:

## Populate Initial Videos

To populate the database with JSON data, first cd back to `cse356-project` and then do `node scripts/populateDB.js`

You can change the json file you want to populate in `.env` file.
