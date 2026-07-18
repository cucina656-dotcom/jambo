export default {
  async fetch(request, env) {
    // ===== FIXED: Added Cache-Control to allowed headers =====
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control', // ✅ FIXED: Added Cache-Control
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);

    // ==================== NEW HOME ROUTES ====================

    // GET /api/home - Get home page data including branding
    if (url.pathname === '/api/home' && request.method === 'GET') {
      try {
        const settings = await env.DB.prepare(
          'SELECT key, value FROM home_settings'
        ).all();

        const settingsObj = {};
        settings.results.forEach(row => {
          settingsObj[row.key] = row.value;
        });

        return Response.json({
          success: true,
          video_url: settingsObj.video_url || 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
          media_type: settingsObj.media_type || '',
          subtitle: settingsObj.subtitle || '',
          subtitle_link: settingsObj.subtitle_link || '',
          subtitle_delay: Number(settingsObj.subtitle_delay) || 0,
          subtitle_duration: Number(settingsObj.subtitle_duration) || 6,
          title: settingsObj.title || 'ChillaX',
          description: settingsObj.description || 'Order food, watch TV, and dedicate songs to people you love.',
          logo_url: settingsObj.logo_url || '',
          creator_identity: settingsObj.creator_identity || '',
          creator_type: settingsObj.creator_type || ''
        }, { headers });
      } catch (error) {
        console.error('Error fetching home settings:', error);
        return Response.json(
          { success: false, message: 'Failed to fetch home settings' },
          { status: 500, headers }
        );
      }
    }

    // POST /api/home/update - Update home page settings with multipart/form-data
    if (url.pathname === '/api/home/update' && request.method === 'POST') {
      try {
        const formData = await request.formData();

        const creator_identity = formData.get('creator_identity');
        const creator_type = formData.get('creator_type');
        const title = formData.get('title') || 'ChillaX';
        const subtitle = formData.get('subtitle') || '';
        const video_url = String(formData.get('video_url') || '').trim();
        const media_type = String(formData.get('media_type') || '').trim();
        const logo_file = formData.get('logo_file');
        const media_file = formData.get('media_file');

        if (!creator_identity) {
          return Response.json({
            success: false,
            message: 'creator_identity is required'
          }, { status: 400, headers });
        }

        if (!video_url && !media_file) {
          return Response.json({
            success: false,
            message: 'Either video_url or media_file must be provided'
          }, { status: 400, headers });
        }

        const currentSettings = await env.DB.prepare(
          'SELECT key, value FROM home_settings'
        ).all();

        const currentSettingsObj = {};
        currentSettings.results.forEach(row => {
          currentSettingsObj[row.key] = row.value;
        });

        let finalLogoUrl = currentSettingsObj.logo_url || '';

        if (logo_file && logo_file.size > 0) {
          try {
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(logo_file.type)) {
              return Response.json({
                success: false,
                message: 'Invalid logo file type. Please upload JPEG, PNG, GIF, or WEBP.'
              }, { status: 400, headers });
            }
            const ext = logo_file.name.split('.').pop();
            const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            await env.MEDIA_BUCKET.put(fileName, logo_file.stream(), {
              httpMetadata: { contentType: logo_file.type },
            });
            finalLogoUrl = `https://pub-348532eda6cd4d94b56397a28469c96d.r2.dev/${fileName}`;
          } catch (error) {
            console.error('Failed to upload logo:', error);
            return Response.json({
              success: false,
              message: 'Failed to upload logo: ' + error.message
            }, { status: 500, headers });
          }
        }

        let finalVideoUrl = video_url;
        let finalMediaType = media_type;

        if (media_file && media_file.size > 0) {
          try {
            const validTypes = [
              'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
              'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
              'audio/mpeg', 'audio/wav', 'audio/ogg'
            ];

            if (!validTypes.includes(media_file.type)) {
              return Response.json({
                success: false,
                message: 'Invalid file type. Please upload images (JPG, PNG, GIF, WEBP) or videos (MP4, WEBM, OGG, MOV, AVI) or audio (MP3, WAV, OGG).'
              }, { status: 400, headers });
            }

            if (media_file.type.startsWith('image/')) {
              finalMediaType = 'image';
            } else if (media_file.type.startsWith('video/')) {
              finalMediaType = 'video';
            } else if (media_file.type.startsWith('audio/')) {
              finalMediaType = 'audio';
            }

            const ext = media_file.name.split('.').pop();
            const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            await env.MEDIA_BUCKET.put(fileName, media_file.stream(), {
              httpMetadata: { contentType: media_file.type },
            });
            finalVideoUrl = `https://pub-348532eda6cd4d94b56397a28469c96d.r2.dev/${fileName}`;
          } catch (error) {
            console.error('Failed to upload media:', error);
            return Response.json({
              success: false,
              message: 'Failed to upload media: ' + error.message
            }, { status: 500, headers });
          }
        }

        const settings = [
          { key: 'video_url', value: finalVideoUrl },
          { key: 'media_type', value: finalMediaType },
          { key: 'subtitle', value: subtitle },
          { key: 'subtitle_link', value: currentSettingsObj.subtitle_link || '' },
          { key: 'subtitle_delay', value: currentSettingsObj.subtitle_delay || '0' },
          { key: 'subtitle_duration', value: currentSettingsObj.subtitle_duration || '6' },
          { key: 'title', value: title },
          { key: 'description', value: currentSettingsObj.description || 'Order food, watch TV, and dedicate songs to people you love.' },
          { key: 'logo_url', value: finalLogoUrl },
          { key: 'creator_identity', value: creator_identity },
          { key: 'creator_type', value: creator_type || detectCreatorType(creator_identity) }
        ];

        for (const setting of settings) {
          await env.DB.prepare(
            'INSERT OR REPLACE INTO home_settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
          ).bind(setting.key, setting.value).run();
        }

        return Response.json({
          success: true,
          message: 'Home settings updated successfully',
          data: {
            video_url: finalVideoUrl,
            media_type: finalMediaType,
            subtitle: subtitle,
            title: title,
            logo_url: finalLogoUrl,
            creator_identity: creator_identity,
            creator_type: creator_type || detectCreatorType(creator_identity)
          }
        }, { headers });
      } catch (error) {
        console.error('Error updating home settings:', error);
        return Response.json({
          success: false,
          message: 'Error updating home settings: ' + error.message
        }, { status: 500, headers });
      }
    }

    function detectCreatorType(value = '') {
      const clean = value.trim().toLowerCase();
      if (!clean) return '';
      if (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('.')) {
        return 'website';
      }
      return 'whatsapp';
    }

    // Upload video to R2
    if (url.pathname === '/api/upload-video' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const videoFile = formData.get('video');

        if (!videoFile || videoFile.size === 0) {
          return Response.json(
            { success: false, message: 'No video file provided' },
            { status: 400, headers }
          );
        }

        const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        if (!validTypes.includes(videoFile.type)) {
          return Response.json(
            { success: false, message: 'Invalid file type. Please upload MP4, WEBM, or OGG.' },
            { status: 400, headers }
          );
        }

        const ext = videoFile.name.split('.').pop();
        const fileName = `video-${Date.now()}.${ext}`;
        await env.MEDIA_BUCKET.put(fileName, videoFile.stream(), {
          httpMetadata: { contentType: videoFile.type },
        });

        const videoUrl = `https://pub-348532eda6cd4d94b56397a28469c96d.r2.dev/${fileName}`;

        await env.DB.prepare(
          'UPDATE home_settings SET value = ?, updated_at = datetime(\'now\') WHERE key = \'video_url\''
        ).bind(videoUrl).run();

        return Response.json({
          success: true,
          url: videoUrl,
          message: 'Video uploaded and updated successfully'
        }, { headers });
      } catch (error) {
        console.error('Error uploading video:', error);
        return Response.json(
          { success: false, message: 'Failed to upload video: ' + error.message },
          { status: 500, headers }
        );
      }
    }

    // Upload logo to R2
    if (url.pathname === '/api/upload-logo' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const logoFile = formData.get('logo');

        if (!logoFile || logoFile.size === 0) {
          return Response.json(
            { success: false, message: 'No logo file provided' },
            { status: 400, headers }
          );
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(logoFile.type)) {
          return Response.json(
            { success: false, message: 'Invalid file type. Please upload JPEG, PNG, GIF, or WEBP.' },
            { status: 400, headers }
          );
        }

        const ext = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${ext}`;
        await env.MEDIA_BUCKET.put(fileName, logoFile.stream(), {
          httpMetadata: { contentType: logoFile.type },
        });

        const logoUrl = `https://pub-348532eda6cd4d94b56397a28469c96d.r2.dev/${fileName}`;

        return Response.json({
          success: true,
          url: logoUrl,
          message: 'Logo uploaded successfully'
        }, { headers });
      } catch (error) {
        console.error('Error uploading logo:', error);
        return Response.json(
          { success: false, message: 'Failed to upload logo' },
          { status: 500, headers }
        );
      }
    }

    // ==================== END NEW HOME ROUTES ====================

    // DEBUG ROUTE - Check if orders table exists and count records
    if (url.pathname === '/api/debug-orders') {
      try {
        const result = await env.DB.prepare(
          'SELECT COUNT(*) AS total FROM orders'
        ).first();
        return Response.json({
          success: true,
          total: result.total,
          table_exists: true,
        }, { headers });
      } catch (error) {
        return Response.json({
          success: false,
          error: error.message,
          table_exists: false,
        }, { status: 500, headers });
      }
    }

    if (url.pathname === '/') {
      return Response.json({ success: true, message: 'kitchenbrain API is running' }, { headers });
    }

    // TEST ROUTE - Check R2 bucket access
    if (url.pathname === '/api/test-r2') {
      return Response.json({
        success: true,
        bucket: !!env.MEDIA_BUCKET,
      });
    }

    // CREATE DEDICATION
    if (url.pathname === '/api/dedications' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const sender_name = formData.get('sender_name');
        const sender_whatsapp = formData.get('sender_whatsapp');
        const recipient_name = formData.get('recipient_name');
        const dedication_title = formData.get('dedication_title') || '';
        const dedication_badge = formData.get('dedication_badge') || '❤️';
        const message = formData.get('message');
        const media_url = formData.get('media_url') || '';
        const sender_photo_file = formData.get('sender_photo_file');
        const recipient_photo_file = formData.get('recipient_photo_file');
        const media_file = formData.get('media_file');

        if (!sender_name || !sender_whatsapp || !recipient_name || !message) {
          return Response.json(
            { success: false, message: 'Missing required fields' },
            { status: 400, headers }
          );
        }

        let sender_photo_url = formData.get('sender_photo') || '';
        if (sender_photo_file && sender_photo_file.size > 0) {
          try {
            const ext = sender_photo_file.name.split('.').pop();
            const fileName = `sender-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            await env.MEDIA_BUCKET.put(fileName, sender_photo_file.stream(), {
              httpMetadata: { contentType: sender_photo_file.type },
            });
            sender_photo_url = `https://pub-348532eda6cd4d94b56397a28469c96d.r2.dev/${fileName}`;
          } catch (error) {
            console.error('Failed to upload sender photo:', error);
            return Response.json(
              { success: false, message: 'Failed to upload sender photo to storage: ' + error.message },
              { status: 500, headers }
            );
          }
        }

        let recipient_photo_url = formData.get('recipient_photo') || '';
        if (recipient_photo_file && recipient_photo_file.size > 0) {
          try {
            const ext = recipient_photo_file.name.split('.').pop();
            const fileName = `recipient-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            await env.MEDIA_BUCKET.put(fileName, recipient_photo_file.stream(), {
              httpMetadata: { contentType: recipient_photo_file.type },
            });
            recipient_photo_url = `https://pub-348532eda6cd4d94b56397a28469c96d.r2.dev/${fileName}`;
          } catch (error) {
            console.error('Failed to upload recipient photo:', error);
            return Response.json(
              { success: false, message: 'Failed to upload recipient photo to storage: ' + error.message },
              { status: 500, headers }
            );
          }
        }

        let final_media_url = media_url;
        if (media_file && media_file.size > 0) {
          try {
            const validTypes = [
              'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
              'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
              'audio/mpeg', 'audio/wav', 'audio/ogg'
            ];

            if (!validTypes.includes(media_file.type)) {
              return Response.json({
                success: false,
                message: 'Invalid file type. Please upload images (JPG, PNG, GIF, WEBP) or videos (MP4, WEBM, OGG, MOV, AVI) or audio (MP3, WAV, OGG).'
              }, { status: 400, headers });
            }

            const ext = media_file.name.split('.').pop();
            const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            await env.MEDIA_BUCKET.put(fileName, media_file.stream(), {
              httpMetadata: { contentType: media_file.type },
            });
            final_media_url = `https://pub-348532eda6cd4d94b56397a28469c96d.r2.dev/${fileName}`;
          } catch (error) {
            console.error('Failed to upload media file:', error);
            return Response.json(
              { success: false, message: 'Failed to upload media file to storage: ' + error.message },
              { status: 500, headers }
            );
          }
        }

        await env.DB.prepare(
          `INSERT INTO dedications (
            sender_name,
            sender_whatsapp,
            sender_photo,
            recipient_name,
            recipient_photo,
            dedication_title,
            dedication_badge,
            message,
            media_url,
            views,
            reaction_count,
            comment_count,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, datetime('now'))`
        )
        .bind(
          sender_name,
          sender_whatsapp,
          sender_photo_url,
          recipient_name,
          recipient_photo_url,
          dedication_title,
          dedication_badge,
          message,
          final_media_url
        )
        .run();

        const created = await env.DB.prepare(
          `SELECT
            id,
            sender_name,
            sender_whatsapp,
            sender_photo,
            recipient_name,
            recipient_photo,
            dedication_title,
            dedication_badge,
            message,
            media_url,
            views,
            reaction_count,
            comment_count,
            created_at
          FROM dedications
          WHERE id = last_insert_rowid()`
        ).first();

        return Response.json({
          success: true,
          message: 'Dedication created successfully',
          dedication: created
        }, { headers });
      } catch (error) {
        console.error('Error creating dedication:', error);
        return Response.json(
          { success: false, message: 'Failed to create dedication: ' + error.message },
          { status: 500, headers }
        );
      }
    }

    // GET ALL DEDICATIONS
    if (url.pathname === '/api/dedications' && request.method === 'GET') {
      try {
        const dedications = await env.DB.prepare(
          `SELECT
            id,
            sender_name,
            sender_whatsapp,
            sender_photo,
            recipient_name,
            recipient_photo,
            dedication_title,
            dedication_badge,
            message,
            media_url,
            views,
            reaction_count,
            comment_count,
            created_at
          FROM dedications
          ORDER BY id DESC`
        ).all();

        return Response.json({
          success: true,
          dedications: dedications.results
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to fetch dedications' },
          { status: 500, headers }
        );
      }
    }

    // USER: add comment under one media (legacy)
    if (url.pathname === '/api/media-comment' && request.method === 'POST') {
      const data = await request.json();
      if (!data.media_id || !data.whatsapp || !data.comment) {
        return Response.json(
          { success: false, message: 'media_id, whatsapp, and comment are required' },
          { status: 400, headers }
        );
      }
      await env.DB.prepare(
        `INSERT INTO media_comments (media_id, whatsapp, comment) VALUES (?, ?, ?)`
      )
        .bind(data.media_id, data.whatsapp, data.comment)
        .run();
      return Response.json(
        { success: true, message: 'Comment saved' },
        { headers }
      );
    }

    // PUBLIC: get comments for one media only (legacy)
    if (url.pathname === '/api/media-comments' && request.method === 'GET') {
      const mediaId = url.searchParams.get('media_id');
      if (!mediaId) {
        return Response.json(
          { success: false, message: 'media_id is required' },
          { status: 400, headers }
        );
      }
      const comments = await env.DB.prepare(
        `SELECT id, media_id, whatsapp, comment, created_at
         FROM media_comments
         WHERE media_id = ?
         ORDER BY id DESC`
      )
        .bind(mediaId)
        .all();
      return Response.json(
        { success: true, comments: comments.results },
        { headers }
      );
    }

    // CUSTOMER: create order
    if (url.pathname === '/api/orders' && request.method === 'POST') {
      const data = await request.json();
      await env.DB.prepare(
        `INSERT OR IGNORE INTO users (whatsapp) VALUES (?)`
      ).bind(data.whatsapp).run();

      const user = await env.DB.prepare(
        `SELECT user_status FROM users WHERE whatsapp = ?`
      ).bind(data.whatsapp).first();

      if (user?.user_status === 'Blocked') {
        return Response.json({ success: false, message: 'User is blocked' }, { status: 403, headers });
      }

      await env.DB.prepare(
        `INSERT INTO orders
        (food_name, price, whatsapp, delivery_method, location, delivery_status)
        VALUES (?, ?, ?, ?, ?, 'Pending')`
      ).bind(
        data.food_name,
        data.price,
        data.whatsapp,
        data.delivery_method,
        data.location || 'M Cantine Shop'
      ).run();

      return Response.json({ success: true, message: 'Order saved successfully' }, { headers });
    }

    // DELIVERY TEAM: load pending orders
    if (url.pathname === '/api/delivery/orders' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '000') {
        return Response.json({ success: false, message: 'Wrong delivery PIN' }, { status: 401, headers });
      }
      const orders = await env.DB.prepare(
        `SELECT * FROM orders ORDER BY id DESC`
      ).all();
      return Response.json({ success: true, orders: orders.results }, { headers });
    }

    // DELIVERY TEAM: update order status
    if (url.pathname === '/api/delivery/update' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '000') {
        return Response.json({ success: false, message: 'Wrong delivery PIN' }, { status: 401, headers });
      }
      await env.DB.prepare(
        `UPDATE orders
         SET delivery_status = ?, delivery_note = ?, confirmed_by = 'Delivery Team', confirmed_at = datetime('now')
         WHERE id = ?`
      ).bind(data.status, data.note || '', data.order_id).run();
      return Response.json({ success: true, message: 'Order updated' }, { headers });
    }

    // ==================== ADMIN ORDERS ROUTES ====================

    // ADMIN: all orders + reports
    if (url.pathname === '/api/admin/orders' && request.method === 'POST') {
      try {
        const data = await request.json();
        if (data.pin !== '101') {
          return Response.json({ success: false, message: 'Wrong admin PIN' }, { status: 401, headers });
        }

        const ordersResult = await env.DB.prepare(
          `SELECT * FROM orders ORDER BY created_at DESC`
        ).all();

        const orderList = ordersResult.results || [];
        const totalOrders = orderList.length;
        const totalRevenue = orderList.reduce((sum, order) => {
          const orderAmount = Number(order.price || order.total || order.amount || 0);
          return sum + (isNaN(orderAmount) ? 0 : orderAmount);
        }, 0);

        return Response.json({
          success: true,
          orders: orderList,
          reports: {
            totalOrders: totalOrders,
            totalRevenue: totalRevenue
          }
        }, { headers });
      } catch (error) {
        console.error('Database error while fetching admin orders:', error);
        return Response.json(
          { success: false, message: 'Failed to load orders and reports data: ' + error.message },
          { status: 500, headers }
        );
      }
    }

    // ADMIN: Delete order
    if (url.pathname === '/api/admin/delete-order' && request.method === 'POST') {
      try {
        const data = await request.json();
        if (data.pin !== '101') {
          return Response.json({ success: false, message: 'Wrong admin PIN' }, { status: 401, headers });
        }
        if (!data.order_id) {
          return Response.json({ success: false, message: 'Missing order_id' }, { status: 400, headers });
        }
        await env.DB.prepare(
          `DELETE FROM orders WHERE id = ?`
        ).bind(data.order_id).run();
        return Response.json({
          success: true,
          message: 'Order deleted successfully'
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to delete order: ' + error.message },
          { status: 500, headers }
        );
      }
    }

    // ADMIN: block user
    if (url.pathname === '/api/admin/block-user' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json({ success: false, message: 'Wrong admin PIN' }, { status: 401, headers });
      }
      await env.DB.prepare(
        `INSERT OR IGNORE INTO users (whatsapp) VALUES (?)`
      ).bind(data.whatsapp).run();
      await env.DB.prepare(
        `UPDATE users
         SET user_status = 'Blocked', blocked_reason = ?, blocked_at = datetime('now')
         WHERE whatsapp = ?`
      ).bind(data.reason || '', data.whatsapp).run();
      return Response.json({ success: true, message: 'User blocked' }, { headers });
    }

    // ADMIN: unblock user
    if (url.pathname === '/api/admin/unblock-user' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json({ success: false, message: 'Wrong admin PIN' }, { status: 401, headers });
      }
      await env.DB.prepare(
        `UPDATE users
         SET user_status = 'Active', blocked_reason = '', blocked_at = ''
         WHERE whatsapp = ?`
      ).bind(data.whatsapp).run();
      return Response.json({ success: true, message: 'User unblocked' }, { headers });
    }

    // ADMIN: most watched media
    if (url.pathname === '/api/admin/media-ranking' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json({ success: false, message: 'Wrong admin PIN' }, { status: 401, headers });
      }
      const media = await env.DB.prepare(
        `SELECT title, views, watch_seconds
         FROM media
         ORDER BY views DESC, watch_seconds DESC
         LIMIT 20`
      ).all();
      return Response.json({ success: true, media: media.results }, { headers });
    }

    // USER: react to dedication
    if (url.pathname === '/api/dedications/react' && request.method === 'POST') {
      const data = await request.json();
      if (!data.id) {
        return Response.json(
          { success: false, message: 'Missing dedication ID' },
          { status: 400, headers }
        );
      }
      await env.DB.prepare(
        `UPDATE dedications
         SET reaction_count = reaction_count + 1
         WHERE id = ?`
      ).bind(data.id).run();
      return Response.json({ success: true, message: 'Reaction added' }, { headers });
    }

    // GET comments for a dedication
    if (url.pathname === '/api/dedications/comments' && request.method === 'GET') {
      const dedicationId = url.searchParams.get('id');
      if (!dedicationId) {
        return Response.json(
          { success: false, message: 'Missing dedication ID' },
          { status: 400, headers }
        );
      }
      try {
        const comments = await env.DB.prepare(
          `SELECT id, comment, commenter_whatsapp, created_at
           FROM dedication_comments
           WHERE dedication_id = ?
           ORDER BY id DESC`
        ).bind(dedicationId).all();
        return Response.json({
          success: true,
          comments: comments.results
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to fetch comments' },
          { status: 500, headers }
        );
      }
    }

    // USER: comment on dedication
    if (url.pathname === '/api/dedications/comment' && request.method === 'POST') {
      const data = await request.json();
      if (!data.id || !data.comment) {
        return Response.json(
          { success: false, message: 'Missing dedication ID or comment' },
          { status: 400, headers }
        );
      }
      try {
        await env.DB.prepare(
          `INSERT INTO dedication_comments (dedication_id, comment, commenter_whatsapp, created_at)
           VALUES (?, ?, ?, datetime('now'))`
        ).bind(data.id, data.comment, data.commenter_whatsapp || '').run();

        await env.DB.prepare(
          `UPDATE dedications
           SET comment_count = comment_count + 1
           WHERE id = ?`
        ).bind(data.id).run();

        return Response.json({
          success: true,
          message: 'Comment added'
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to save comment' },
          { status: 500, headers }
        );
      }
    }

    // ADMIN: manually edit views, reactions, comments (legacy)
    if (url.pathname === '/api/admin/update-dedication-stats' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json(
          { success: false, message: 'Wrong admin PIN' },
          { status: 401, headers }
        );
      }
      await env.DB.prepare(
        `UPDATE dedications
         SET views = ?, reaction_count = ?, comment_count = ?
         WHERE id = ?`
      )
        .bind(
          data.views,
          data.reaction_count,
          data.comment_count,
          data.id
        )
        .run();
      return Response.json({ success: true, message: 'Stats updated' }, { headers });
    }

    // ==================== ADMIN ROUTES ====================

    // ADMIN: GET all dedications
    if (url.pathname === '/api/admin/dedications' && request.method === 'GET') {
      try {
        const dedications = await env.DB.prepare(
          `SELECT * FROM dedications ORDER BY id DESC`
        ).all();
        return Response.json({
          success: true,
          dedications: dedications.results
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to fetch dedications' },
          { status: 500, headers }
        );
      }
    }

    // ADMIN: Update dedication
    if (url.pathname === '/api/admin/update-dedication' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json(
          { success: false, message: 'Wrong admin PIN' },
          { status: 401, headers }
        );
      }
      if (!data.id) {
        return Response.json(
          { success: false, message: 'Missing dedication ID' },
          { status: 400, headers }
        );
      }
      try {
        await env.DB.prepare(
          `UPDATE dedications
           SET views = ?, reaction_count = ?, comment_count = ?, dedication_badge = ?
           WHERE id = ?`
        )
        .bind(
          data.views || 0,
          data.reaction_count || 0,
          data.comment_count || 0,
          data.dedication_badge || '❤️',
          data.id
        )
        .run();
        return Response.json({
          success: true,
          message: 'Dedication updated successfully'
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to update dedication' },
          { status: 500, headers }
        );
      }
    }

    // ADMIN: Delete dedication
    if (url.pathname === '/api/admin/delete-dedication' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json(
          { success: false, message: 'Wrong admin PIN' },
          { status: 401, headers }
        );
      }
      if (!data.id) {
        return Response.json(
          { success: false, message: 'Missing dedication ID' },
          { status: 400, headers }
        );
      }
      try {
        await env.DB.prepare(
          `DELETE FROM dedication_comments WHERE dedication_id = ?`
        ).bind(data.id).run();
        await env.DB.prepare(
          `DELETE FROM dedications WHERE id = ?`
        ).bind(data.id).run();
        return Response.json({
          success: true,
          message: 'Dedication deleted successfully'
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to delete dedication' },
          { status: 500, headers }
        );
      }
    }

    // ==================== ADMIN COMMENT ROUTES ====================

    // ADMIN: GET all dedication comments
    if (url.pathname === '/api/admin/dedication-comments' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json(
          { success: false, message: 'Wrong admin PIN' },
          { status: 401, headers }
        );
      }
      try {
        const comments = await env.DB.prepare(`
          SELECT *
          FROM dedication_comments
          ORDER BY id DESC
        `).all();
        return Response.json({
          success: true,
          comments: comments.results
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to fetch comments' },
          { status: 500, headers }
        );
      }
    }

    // ADMIN: Create dedication comment
    if (url.pathname === '/api/admin/add-dedication-comment' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json(
          { success: false, message: 'Wrong admin PIN' },
          { status: 401, headers }
        );
      }
      if (!data.dedication_id || !data.comment) {
        return Response.json(
          { success: false, message: 'Missing dedication_id or comment' },
          { status: 400, headers }
        );
      }
      try {
        await env.DB.prepare(`
          INSERT INTO dedication_comments
          (
            dedication_id,
            comment,
            commenter_whatsapp,
            created_at
          )
          VALUES (?, ?, ?, datetime('now'))
        `)
        .bind(
          data.dedication_id,
          data.comment,
          data.commenter_whatsapp || ''
        )
        .run();

        await env.DB.prepare(`
          UPDATE dedications
          SET comment_count = comment_count + 1
          WHERE id = ?
        `)
        .bind(data.dedication_id)
        .run();

        return Response.json({
          success: true,
          message: 'Comment added successfully'
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to add comment' },
          { status: 500, headers }
        );
      }
    }

    // ADMIN: Delete dedication comment
    if (url.pathname === '/api/admin/delete-dedication-comment' && request.method === 'POST') {
      const data = await request.json();
      if (data.pin !== '101') {
        return Response.json(
          { success: false, message: 'Wrong admin PIN' },
          { status: 401, headers }
        );
      }
      if (!data.comment_id) {
        return Response.json(
          { success: false, message: 'Missing comment_id' },
          { status: 400, headers }
        );
      }
      try {
        const row = await env.DB.prepare(`
          SELECT dedication_id
          FROM dedication_comments
          WHERE id = ?
        `)
        .bind(data.comment_id)
        .first();

        if (row) {
          await env.DB.prepare(`
            UPDATE dedications
            SET comment_count =
            CASE
              WHEN comment_count > 0
              THEN comment_count - 1
              ELSE 0
            END
            WHERE id = ?
          `)
          .bind(row.dedication_id)
          .run();
        }

        await env.DB.prepare(`
          DELETE FROM dedication_comments
          WHERE id = ?
        `)
        .bind(data.comment_id)
        .run();

        return Response.json({
          success: true,
          message: 'Comment deleted successfully'
        }, { headers });
      } catch (error) {
        console.error('Database error:', error);
        return Response.json(
          { success: false, message: 'Failed to delete comment' },
          { status: 500, headers }
        );
      }
    }

    // ==================== END ADMIN COMMENT ROUTES ====================

    return Response.json({ success: false, message: 'Route not found' }, { status: 404, headers });
  },
};